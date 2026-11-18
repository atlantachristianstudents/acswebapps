"""Import immutable source releases and export versioned portable packages."""
import argparse
from collections import Counter
from contextlib import closing
from datetime import date
import gzip
import hashlib
import json
from pathlib import Path
import re
import shutil
import sqlite3
from tempfile import TemporaryDirectory

from .evidence import add_evidence
from .importers import wiktionary, wordnet
from .model import SCHEMA, encode, identifier, key
from .store import ROOT, connect, sources
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


def write_records(store, source, version, records, report):
    batches = {name: [] for name in ("source_records", "lexemes", "senses", "forms", "senses_fts")}

    def flush():
        for table, batch in batches.items():
            if batch:
                params = ",".join("?" for _ in batch[0])
                conflict = " ON CONFLICT DO NOTHING" if table == "forms" else ""
                store.many(f"INSERT INTO {table} VALUES ({params}){conflict}", batch)
                batch.clear()

    for entry, raw in records:
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
                                    if term and target and term != target and len(term) <= 240)
            report["lexemes"] += 1
            report["senses"] += len(senses)
            if entry["pos"] == "unknown":
                report["missing_pos"] += 1
        if len(batches["source_records"]) >= 1000:
            flush()
    flush()


def import_source(store, source, file, version, expected, selected):
    metadata = sources()[source]
    checksum = sha256(file)
    if expected and checksum != expected.lower():
        raise ValueError("The source file checksum did not match")
    if not selected and metadata["version"] == version and metadata.get("sha256") not in (None, checksum):
        raise ValueError("The pinned source release checksum did not match")
    selection = identifier(*sorted(selected)) if selected is not None else None
    current = store.query("SELECT checksum,metadata FROM releases WHERE source=? AND version=?", (source, version)).fetchone()
    if current and (current[0] != checksum or json.loads(current[1]).get("selection") != selection):
        raise ValueError("This release ID already identifies different source bytes")
    if not current:
        report = Counter()
        metadata.update(version=version, checksum=checksum, subset=selected is not None, selection=selection)
        store.query("INSERT INTO releases VALUES (?,?,?,?)", (source, version, checksum, encode(metadata)))
        if source == "oewn":
            with TemporaryDirectory(prefix="open-dict-import-") as folder, closing(sqlite3.connect(Path(folder) / "work.sqlite")) as temp:
                write_records(store, source, version, wordnet(file, selected, temp, report), report)
        else:
            reader = {"wiktionary": wiktionary, "webster1913": webster}[source]
            write_records(store, source, version, reader(file, selected, report), report)
        if not report["lexemes"]:
            raise ValueError("No English lexical entries were imported")
        metadata["report"] = dict(report)
        store.query("UPDATE releases SET metadata=? WHERE source=? AND version=?", (encode(metadata), source, version))
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
    output = directory / version
    output.mkdir()
    release_info = {"schema": SCHEMA, "release": version, "date": date.today().isoformat(), "editions": {},
                    "sources": {k: public_source(v) for k, v in source_info.items()}}
    for edition, selection in selections:
        if edition == "Essential English" and not selection:
            continue
        files = []
        batch, size, count = [], 0, 0

        def write_chunk():
            nonlocal size
            name = f"{edition.split()[0].lower()}-{len(files):04}.ndjson.gz"
            path = output / name
            with path.open("wb") as stream, gzip.GzipFile(filename="", fileobj=stream, mode="wb", mtime=0) as zipped:
                zipped.writelines(batch)
            files.append({"path": version + "/" + name, "bytes": path.stat().st_size,
                          "decodedBytes": size, "sha256": sha256(path), "entries": len(batch)})
            batch.clear()
            size = 0

        for record in groups(store, selection):
            if edition == "Essential English":
                record["groups"] = [group for group in record["groups"] if not group.get("historical")]
                if not record["groups"]:
                    continue
                record = essential(record)
            elif edition == "Scholarly Research":
                record = add_evidence(store, record, source_info)
            line = (encode(record) + "\n").encode()
            if batch and size + len(line) > 2 * 1024 * 1024:
                write_chunk()
            batch.append(line)
            size += len(line)
            count += 1
        if batch:
            write_chunk()
        if files:
            release_info["editions"][edition] = {"files": files, "headwords": count,
                                                 "bytes": sum(f["bytes"] for f in files)}
    if not release_info["editions"]:
        raise ValueError("No data are active")
    manifest = directory / "manifest.json"
    pending = manifest.with_suffix(".tmp")
    pending.write_text(encode(release_info) + "\n", encoding="utf-8")
    pending.replace(manifest)
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
    parser.add_argument("--db", default=".local/open-dict.sqlite", help="SQLite file or PostgreSQL DSN")
    commands = parser.add_subparsers(dest="command", required=True)
    commands.add_parser("init")
    commands.add_parser("seed")
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
    sqlite = commands.add_parser("portable")
    sqlite.add_argument("directory", type=Path)
    sqlite.add_argument("--id", required=True)
    sample = commands.add_parser("fixture")
    sample.add_argument("--words", required=True)
    sample.add_argument("--wiktionary-words")
    sample.add_argument("--output", type=Path, required=True)
    commands.add_parser("report")
    args = parser.parse_args()
    if not args.db.startswith(("postgresql://", "postgres://")):
        Path(args.db).parent.mkdir(parents=True, exist_ok=True)
    read_only = args.command in {"report", "release", "portable", "fixture"}
    with connect(args.db, read_only=read_only) as store:
        if not read_only:
            store.initialize()
        if args.command in {"init", "report"}:
            result = store.report()
        elif args.command == "import":
            selected = read_words(args.words)
            if args.words and not selected:
                parser.error("Word list is empty")
            result = import_source(store, args.source, args.file, args.version, args.sha256, selected)
        elif args.command == "release":
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
        print(json.dumps(result, ensure_ascii=False))


if __name__ == "__main__":
    main()
