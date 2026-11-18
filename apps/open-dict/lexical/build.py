"""Import immutable source releases and export versioned portable packages."""
import argparse
from collections import Counter
from contextlib import closing
from datetime import date, datetime, timezone
import gzip
import hashlib
import json
import os
import sys
from itertools import islice
from pathlib import Path
import re
import shutil
import sqlite3
from tempfile import TemporaryDirectory

from .coverage import count_group, count_sense, report_coverage
from .download import download
from .evidence import add_evidence
from .importers import wiktionary, wordnet
from .model import SCHEMA, encode, identifier, key
from .store import ROOT, connect, coverage_scope, sources
from .webster import webster


def sha256(path):
    digest = hashlib.sha256()
    with open(path, "rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def read_words(path):
    return {key(line) for line in Path(path).read_text(encoding="utf-8").splitlines()
            if line.strip() and not line.lstrip().startswith("#")} if path else None


def aliases(entry):
    for form in entry.get("forms", []):
        tags = set(form["labels"])
        variant = any("alternative" in tag.lower() or "variant" in tag.lower() for tag in tags)
        yield key(form["word"]), key(entry["word"]), "variant" if variant else "form"
    for group in [entry, *entry["senses"]]:
        for field, kind in (("form_of", "form"), ("alt_of", "variant")):
            for relation in group.get("relations", {}).get(field, []):
                yield key(entry["word"]), key(relation["word"]), kind
                if kind == "variant":
                    yield key(relation["word"]), key(entry["word"]), kind


def write_records(store, source, version, records, report, checkpoint=None, start=0):
    batches = {name: [] for name in ("source_records", "lexemes", "senses", "forms", "senses_fts")}

    def flush():
        for table, batch in batches.items():
            if batch:
                params = ",".join("?" for _ in batch[0])
                conflict = " ON CONFLICT DO NOTHING" if table == "forms" else ""
                store.many(f"INSERT INTO {table} VALUES ({params}){conflict}", batch)
                batch.clear()

    for number, (entry, raw) in enumerate(records, start + 1):
        report["archived_records"] += 1
        if entry is None:
            batches["source_records"].append((source, version, *raw))
        else:
            entry_id = entry["id"]
            prefix = (source, version)
            batches["source_records"].append((*prefix, entry_id, raw))
            senses = entry.pop("senses")
            batches["lexemes"].append((*prefix, entry_id, entry["word"], key(entry["word"]),
                                       entry["pos"], entry_id, encode(entry)))
            entry["senses"] = senses
            for n, sense in enumerate(senses):
                line = (*prefix, sense["id"], entry_id, next(iter(sense.get("sourceIds", [])), None),
                        sense.get("parent"), n, sense["definition"], encode(sense))
                batches["senses"].append(line)
                if not store.postgres:
                    batches["senses_fts"].append((sense["definition"], sense["id"], *prefix))
            batches["forms"].extend((*prefix, term, target, kind) for term, target, kind in aliases(entry)
                                    if term and target and term != target)
            report["lexemes"] += 1
            report["senses"] += len(senses)
            if entry["pos"] == "unknown":
                report["missing_pos"] += 1
        if len(batches["source_records"]) >= (6000 if checkpoint else 1000):
            flush()
            if checkpoint:
                checkpoint(number)
    flush()
    # Record the last yielded row as well, so restart is safe during post-import validation.
    if checkpoint and report["archived_records"] > start:
        checkpoint(report["archived_records"])


def available_capacity(directory, needed):
    free = shutil.disk_usage(directory).free
    if free < needed:
        raise ValueError(f"Insufficient disk space in {directory}: {free:,} bytes free, {needed:,} bytes required")


def check_import(store, source, version, report):
    for table, metric in (("source_records", "archived_records"), ("lexemes", "lexemes"), ("senses", "senses")):
        count = store.query(f"SELECT count(*) FROM {table} WHERE source=? AND version=?", (source, version)).fetchone()[0]
        if count != report[metric] or (table != "source_records" and not count):
            raise ValueError(f"Incomplete import for {source}: {table} {count:,} differs from {report[metric]:,}")
    if not store.postgres:
        count = store.query("SELECT count(*) FROM senses_fts WHERE source=? AND version=?", (source, version)).fetchone()[0]
        if count != report["senses"]:
            raise ValueError(f"Search index count {count:,} does not match imported sense count {report['senses']:,}")


def import_source(store, source, file, version, expected, selected, progress=False):
    metadata = sources()[source]
    checksum = sha256(file)
    if expected and checksum != expected.lower():
        raise ValueError("The source file checksum did not match")
    if not selected and metadata["version"] == version and metadata.get("sha256") not in (None, checksum):
        raise ValueError("The pinned source release checksum did not match")
    selection = identifier(*sorted(selected)) if selected is not None else None
    current = store.query("SELECT checksum,metadata FROM releases WHERE source=? AND version=?", (source, version)).fetchone()
    if current and (current[0] != checksum or json.loads(current[1]).get("selection") != selection):
        raise ValueError("This release ID already identifies different source bytes or a different selection")
    previous = store.query("SELECT records,report FROM import_checkpoints WHERE source=? AND version=?",
                           (source, version)).fetchone()
    if not current or previous:
        report = Counter()
        if checksum == metadata.get("sha256"):
            metadata["upstreamVersion"] = metadata["version"]
        metadata.update(version=version, checksum=checksum, subset=selected is not None, selection=selection)
        if not current:
            store.query("INSERT INTO releases VALUES (?,?,?,?)", (source, version, checksum, encode(metadata)))
        start, saved = (previous[0], json.loads(previous[1])) if previous else (0, {})
        if not store.postgres and selected is None:
            database = store.query("PRAGMA database_list").fetchone()[2]
            estimate = file.stat().st_size * (3 if source == "wiktionary" else 42 if source == "oewn" else 10)
            baseline_records = metadata.get("baseline", {}).get("archived_records", 0) if checksum == metadata["sha256"] else 0
            remaining = min(1, max(0, 1 - start / baseline_records)) if baseline_records else 1
            available_capacity(Path(database).parent, max(128 * 1024**2, int(estimate * remaining)))

        last = start
        def checkpoint(number):
            nonlocal last
            if number == last:
                return
            stamp = datetime.now(timezone.utc).isoformat()
            store.query("""
                INSERT INTO import_checkpoints VALUES (?,?,?,?,?)
                ON CONFLICT (source,version) DO UPDATE SET records=excluded.records,
                    updated_at=excluded.updated_at, report=excluded.report
            """, (source, version, number, stamp, encode(report)))
            store.connection.commit()
            last = number
            if progress:
                scanned = report["records_scanned"] or report["source_records_read"]
                baseline = metadata.get("baseline", {})
                total = baseline.get("records_scanned") if checksum == metadata.get("sha256") else None
                rejected = sum(report[k] for k in ("invalid_headwords", "duplicate_entry_records",
                                                   "entries_without_senses", "entries_without_marked_definitions"))
                left = f", {max(0, total - scanned):,} input rows remaining" if total is not None else ""
                print(f"{source}: {scanned:,} scanned, {report['archived_records']:,} archived, "
                      f"{report['lexemes']:,} lexemes, {report['senses']:,} senses, {rejected:,} rejected{left}",
                      file=sys.stderr, flush=True)

        baseline = metadata.get("baseline", {}) if checksum == metadata.get("sha256") else {}
        staged_all = (source == "wiktionary" and selected is None and
                      saved.get("records_scanned") == baseline.get("records_scanned") and
                      baseline.get("archived_records") == start and start > 0)
        if staged_all:
            report.update(saved)
            if progress:
                print(f"{source}: validating all {start:,} previously staged English records",
                      file=sys.stderr, flush=True)
        else:
            with TemporaryDirectory(prefix="open-dict-import-") as folder, closing(sqlite3.connect(Path(folder) / "work.sqlite")) as temp:
                temp.execute("PRAGMA journal_mode=OFF")
                temp.execute("PRAGMA synchronous=OFF")
                temp.execute("PRAGMA cache_size=-32768")
                if source == "oewn":
                    stream = wordnet(file, selected, temp, report)
                elif source == "wiktionary":
                    stream = wiktionary(file, selected, report, temp)
                else:
                    stream = webster(file, selected, report)
                if start:
                    # Replaying source identity decisions avoids seeking to an unsafe point in gzip or XML.
                    skipped = sum(1 for _ in islice(stream, start))
                    if skipped != start:
                        raise ValueError("The source ended before its saved checkpoint")
                    for field in ("archived_records", "lexemes", "senses", "missing_pos"):
                        report[field] = saved.get(field, 0)
                    if progress:
                        print(f"{source}: resumed after {start:,} archived records", file=sys.stderr, flush=True)
                write_records(store, source, version, stream, report, checkpoint, start)

        if source == "wiktionary":
            report["source_senses_read"] += report["duplicate_source_senses"] + report["rejected_senses"]
        check_import(store, source, version, report)
        if not selected and checksum == metadata.get("sha256"):
            for field, count in metadata.get("baseline", {}).items():
                if report[field] != count:
                    raise ValueError(f"Pinned {source} baseline mismatch for {field}: {report[field]:,} vs {count:,}")
        metadata["report"] = dict(report)
        metadata["completedAt"] = datetime.now(timezone.utc).isoformat()
        store.query("UPDATE releases SET metadata=? WHERE source=? AND version=?", (encode(metadata), source, version))
        store.query("DELETE FROM import_checkpoints WHERE source=? AND version=?", (source, version))
    store.query("""
        INSERT INTO active_releases VALUES (?,?)
        ON CONFLICT (source) DO UPDATE SET version=excluded.version
    """, (source, version))
    return store.report()


def groups(store, selected=None):
    if selected is None:
        yield from store.entries()
    else:
        for word in sorted(selected):
            group = store.lookup(word)
            if group:
                yield group


def essential(record):
    for group in record["groups"]:
        for field in ("etymology", "relations"):
            group.pop(field, None)
        group["pronunciations"] = [
            {k: v for k, v in sound.items() if k not in {"audioUrl", "audioFile"}}
            for sound in group.get("pronunciations", []) if sound.get("ipa")
        ]
        for sense in group["senses"]:
            sense.pop("examples", None)
            sense["relations"] = {"synonyms": sense.get("relations", {}).get("synonyms", [])}
    return record


def pack_chunks(directory, version, prefix, records, size_limit=2 * 1024 * 1024):
    files, batch = [], []
    size = 0

    def write_chunk():
        nonlocal size
        name = f"{prefix}-{len(files):04}.ndjson.gz"
        path = directory / name
        with path.open("wb") as stream, gzip.GzipFile(filename="", fileobj=stream, mode="wb", mtime=0,
                                                       compresslevel=5) as zipped:
            zipped.writelines(line for _, line in batch)
        files.append({"path": version + "/" + name, "bytes": path.stat().st_size,
                      "decodedBytes": size, "sha256": sha256(path), "entries": len(batch),
                      "firstKey":batch[0][0], "lastKey":batch[-1][0]})
        batch.clear()
        size = 0

    for term, record in records:
        line = (encode(record) + "\n").encode()
        if batch and size + len(line) > size_limit:
            write_chunk()
        batch.append((term, line))
        size += len(line)
    if batch:
        write_chunk()
    return files


def pack_forms(store):
    sql = """
        SELECT f.term,f.headword,f.kind,COALESCE(min(CASE WHEN l.spelling=l.headword THEN l.spelling END),min(l.spelling))
        FROM forms f JOIN active_releases a ON f.source=a.source AND f.version=a.version
        JOIN lexemes l ON l.headword=f.headword
        JOIN active_releases b ON l.source=b.source AND l.version=b.version
        GROUP BY f.term,f.headword,f.kind ORDER BY f.term,f.headword,f.kind
    """
    cursor = store.connection.cursor(name="open_dict_pack_aliases") if store.postgres else store.connection.cursor()
    try:
        cursor.execute(sql)
        for term, target, kind, spelling in cursor:
            yield term, {"term":term, "key":target, "kind":kind, "word":spelling}
    finally:
        cursor.close()


def release(store, directory, version, essential_words, scholarly=False):
    if not re.fullmatch(r"[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}", version):
        raise ValueError("Invalid release ID")
    directory.mkdir(parents=True, exist_ok=True)
    source_info = store.release_metadata()
    if not source_info:
        raise ValueError("No data are active")
    selections = [("Essential English", essential_words), ("Complete English", None)]
    if scholarly:
        if not any(not source.get("fixture") and not source.get("portable") for source in source_info.values()):
            raise ValueError("Scholarly Research requires archived source records")
        selections.append(("Scholarly Research", None))
    destination = directory / version
    if destination.exists():
        raise ValueError(f"Release {version} already exists")
    totals = store.report()
    release_info = {"schema": SCHEMA, "release": version, "date": date.today().isoformat(),
                    "coverage":coverage_scope(source_info), "editions": {},
                    "sources": {k: public_source(v) for k, v in source_info.items()}}
    with TemporaryDirectory(prefix=".open-dict-release-", dir=directory) as folder:
        output = Path(folder) / version
        output.mkdir()
        for edition, selection in selections:
            if edition == "Essential English" and not selection:
                continue
            counts = Counter()
            fields = {"headwords", "source attribution", "parts of speech", "definitions"}

            def records():
                for record in groups(store, selection):
                    if edition == "Essential English":
                        record["groups"] = [group for group in record["groups"] if not group.get("historical")]
                        if not record["groups"]:
                            continue
                        record = essential(record)
                    elif edition == "Scholarly Research":
                        add_evidence(store, record, source_info)
                    for group in record["groups"]:
                        count_group(counts, group)
                        if group.get("forms"):
                            fields.add("inflections and forms")
                        if group.get("evidence"):
                            fields.add("source evidence")
                        for sense in group["senses"]:
                            count_sense(counts, sense)
                    yield record["key"], record

            files = pack_chunks(output, version, edition.split()[0].lower(), records())
            if edition != "Essential English" and (sum(f["entries"] for f in files) != totals["headwords"] or
                    counts["lexemes"] != totals["lexemes"] or counts["senses"] != totals["senses"]):
                raise ValueError(f"{edition} does not match the active database counts")
            if files:
                for metric, field in (("pronunciations", "pronunciations"), ("etymologies", "etymologies"),
                                      ("examples", "usage examples"), ("synonym_edges", "synonyms"),
                                      ("antonym_edges", "antonyms"), ("historical_entries", "historical entries")):
                    if counts[metric]:
                        fields.add(field)
                release_info["editions"][edition] = {"files": files, "headwords": sum(f["entries"] for f in files),
                    "lexemes":counts["lexemes"], "senses":counts["senses"],
                    "fields":sorted(fields), "bytes":sum(f["bytes"] for f in files)}
                print(f"Built {edition}: {release_info['editions'][edition]['headwords']:,} headwords",
                      file=sys.stderr, flush=True)
        release_info["online"] = {"aliases":pack_chunks(output, version, "forms", pack_forms(store), 512 * 1024)}
        pending = Path(folder) / "manifest.json"
        pending.write_text(encode(release_info) + "\n", encoding="utf-8")
        output.rename(destination)
        pending.replace(directory / "manifest.json")
    return release_info


def portable(store, directory, version):
    if not re.fullmatch(r"[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}", version):
        raise ValueError("Invalid release ID")
    directory.mkdir(parents=True, exist_ok=True)
    output = directory / (version + ".sqlite.gz")
    manifest = directory / (version + ".sqlite.json")
    if output.exists() or manifest.exists():
        raise ValueError("The portable release already exists")
    source_info = store.release_metadata()
    if not source_info:
        raise ValueError("No data are active")
    with TemporaryDirectory(prefix=".sqlite-export-", dir=directory) as temp:
        temporary = Path(temp)
        database = temporary / "open-dict.sqlite"
        with connect(database) as target:
            target.initialize()
            for source, metadata in source_info.items():
                source_version = metadata["version"]
                portable_metadata = {**metadata, "portable": True,
                                     "recordFormat": "normalized source evidence"}
                target.query("INSERT INTO releases VALUES (?,?,?,?)",
                             (source, source_version, metadata["checksum"], encode(portable_metadata)))
                records = ((group, encode(group)) for record in store.entries()
                           for group in record["groups"] if group["source"] == source)
                write_records(target, source, source_version, records, Counter())
                target.query("INSERT INTO active_releases VALUES (?,?)", (source, source_version))
            counts = target.report()
        compressed = temporary / output.name
        with database.open("rb") as data, compressed.open("wb") as file:
            with gzip.GzipFile(filename="", fileobj=file, mode="wb", mtime=0) as writer:
                shutil.copyfileobj(data, writer)
        result = {"schema": SCHEMA, "release": version, "date": date.today().isoformat(),
                  "edition": "Complete English", "format": "sqlite3+gzip", "path": output.name,
                  "bytes": compressed.stat().st_size, "installedBytes": database.stat().st_size,
                  "sha256": sha256(compressed), "counts": counts,
                  "sources": {name: public_source(source) for name, source in source_info.items()}}
        pending = temporary / manifest.name
        pending.write_text(encode(result) + "\n", encoding="utf-8")
        compressed.replace(output)
        pending.replace(manifest)
    return {name: value for name, value in result.items() if name != "sources"}


def public_source(source):
    return {k: v for k, v in source.items() if k != "notices"}


def fixture(store, selection, output, wiktionary_words):
    records = []
    for entry in groups(store, selection):
        kept = []
        for group in entry["groups"]:
            if group["source"] == "wiktionary" and wiktionary_words and entry["key"] not in wiktionary_words:
                continue
            for sense in group["senses"]:
                preview_types = {"synonyms", "antonym", "antonyms", "hypernym", "hyponym", "form_of", "alt_of"}
                sense["relations"] = {name: terms[:5] for name, terms in sense.get("relations", {}).items()
                                      if name in preview_types}
                for field, value in list(sense.items()):
                    if not value and field not in {"id", "definition"}:
                        del sense[field]
            kept.append(group)
        if kept:
            entry["groups"] = kept
            records.append(entry)
    data = {"schema": SCHEMA, "sources": {k: public_source(v) for k, v in store.release_metadata().items()}}
    lines = ",\n".join(encode(record) for record in records)
    payload = encode(data)[:-1] + ', "entries":[\n' + lines + '\n]}'
    # A checked-in fixture is a classic script so the starter also works from file://.
    output.write_text("window.OPEN_DICT_STARTER = " + payload
                      .replace("\u2028", "\\u2028").replace("\u2029", "\\u2029") + ";\n", encoding="utf-8")
    return {"headwords": len(records), "lexemes": sum(len(entry["groups"]) for entry in records),
            "senses": sum(len(group["senses"]) for entry in records for group in entry["groups"])}


def seed(store):
    path = ROOT / "data/fixtures/starter.js"
    fixture_data = json.loads(path.read_text(encoding="utf-8").removeprefix("window.OPEN_DICT_STARTER = ").strip().removesuffix(";"))
    if fixture_data["schema"] != SCHEMA:
        raise ValueError("The starter fixture has an incompatible schema")
    for source, metadata in fixture_data["sources"].items():
        version = metadata["version"]
        active = store.query("SELECT version FROM active_releases WHERE source=?", (source,)).fetchone()
        if active:
            continue
        groups = [group for record in fixture_data["entries"] for group in record["groups"] if group["source"] == source]
        checksum = hashlib.sha256(encode(groups).encode()).hexdigest()
        metadata = {**metadata, "fixture": True, "checksum": checksum}
        store.query("INSERT INTO releases VALUES (?,?,?,?)", (source, version, checksum, encode(metadata)))
        write_records(store, source, version, ((group, encode(group)) for group in groups), Counter())
        store.query("INSERT INTO active_releases VALUES (?,?)", (source, version))
    return store.report()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--db", default=os.environ.get("OPEN_DICT_DATABASE_URL", ".local/full.sqlite"), help="SQLite file or PostgreSQL DSN")
    commands = parser.add_subparsers(dest="command", required=True)
    commands.add_parser("init")
    commands.add_parser("seed")
    downloads = commands.add_parser("download")
    downloads.add_argument("directory", type=Path)
    all_sources = commands.add_parser("import-all")
    all_sources.add_argument("directory", type=Path)
    commands.add_parser("reindex")
    importer = commands.add_parser("import")
    importer.add_argument("source", choices=sources().keys())
    importer.add_argument("file", type=Path)
    importer.add_argument("--version", required=True)
    importer.add_argument("--sha256")
    importer.add_argument("--words")
    pack = commands.add_parser("release")
    pack.add_argument("directory", type=Path)
    pack.add_argument("--id", required=True)
    pack.add_argument("--essential-words")
    pack.add_argument("--scholarly", action="store_true")
    pack.add_argument("--allow-partial", action="store_true", help="Build a fixture pack explicitly")
    sqlite = commands.add_parser("portable")
    sqlite.add_argument("directory", type=Path)
    sqlite.add_argument("--id", required=True)
    sample = commands.add_parser("fixture")
    sample.add_argument("--words", required=True)
    sample.add_argument("--wiktionary-words")
    sample.add_argument("--output", type=Path, required=True)
    commands.add_parser("report")
    coverage = commands.add_parser("coverage")
    coverage.add_argument("--packs", type=Path, default=ROOT / "data/releases")
    args = parser.parse_args()
    if args.command == "download":
        for source in sources().values():
            print(download(source, args.directory, sha256))
        return
    if not args.db.startswith(("postgresql://", "postgres://")):
        Path(args.db).parent.mkdir(parents=True, exist_ok=True)
    read_only = args.command in {"report", "coverage", "release", "portable", "fixture"}
    with connect(args.db, read_only=read_only) as store:
        if not read_only:
            store.initialize()
        if args.command in {"import", "import-all"} and not store.postgres:
            store.connection.commit()
            store.query("PRAGMA journal_mode=WAL")
            store.query("PRAGMA synchronous=NORMAL")
            store.query("PRAGMA cache_size=-98304")
        if args.command in {"init", "report"}:
            result = store.report()
        elif args.command == "import":
            selected = read_words(args.words)
            if args.words and not selected:
                parser.error("Word list is empty")
            result = import_source(store, args.source, args.file, args.version, args.sha256, selected, progress=True)
        elif args.command == "import-all":
            for source, metadata in sources().items():
                archive = args.directory / metadata["filename"]
                if not archive.is_file():
                    parser.error(f"Missing {archive}. Run the download command first")
                version = metadata["version"]
                existing = store.query("SELECT metadata FROM releases WHERE source=? AND version=?", (source, version)).fetchone()
                if existing:
                    saved = json.loads(existing[0])
                    if saved.get("report") and not saved.get("completedAt"):
                        # Previous complete imports predate the raw-gloss and audit fixes.
                        version += " / normalized 2"
                import_source(store, source, archive, version, metadata["sha256"], None, progress=True)
                store.connection.commit()
            result = store.report()
        elif args.command == "coverage":
            result = report_coverage(store, args.packs)
        elif args.command == "reindex":
            store.rebuild_indexes()
            result = store.report()
        elif args.command == "release":
            if not store.postgres:
                store.query("PRAGMA cache_size=-131072")
            if not args.allow_partial and coverage_scope(store.release_metadata()) != "full":
                parser.error("Complete packs require a full import. Use --allow-partial for development fixtures.")
            result = release(store, args.directory, args.id, read_words(args.essential_words), args.scholarly)
        elif args.command == "portable":
            result = portable(store, args.directory, args.id)
        elif args.command == "fixture":
            result = fixture(store, read_words(args.words), args.output, read_words(args.wiktionary_words))
        elif args.command == "seed":
            result = seed(store)
        if args.command == "release":
            result = {"release": result["release"], "editions": {edition: {k: v for k, v in details.items()
                       if k != "files"} for edition, details in result["editions"].items()}}
        print(json.dumps(result, ensure_ascii=False, indent=2 if args.command == "coverage" else None))


if __name__ == "__main__":
    main()
