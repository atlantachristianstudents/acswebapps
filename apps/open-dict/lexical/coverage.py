"""Coverage metrics derived from active lexical rows and verified release manifests."""
from collections import Counter
import json


REJECTION_REASONS = ("invalid_headwords", "duplicate_entry_records", "entries_without_senses",
                     "entries_without_marked_definitions")


def count_relations(counts, value):
    relations = value.get("relations", {})
    for target in ("synonym", "antonym"):
        counts[target + "_edges"] += len(relations.get(target, [])) + len(relations.get(target + "s", []))


def count_group(counts, group):
    counts["lexemes"] += 1
    counts["pos_records"] += group["pos"] != "unknown"
    counts["etymologies"] += bool(group.get("etymology"))
    counts["pronunciations"] += len(group.get("pronunciations", []))
    counts["historical_entries"] += bool(group.get("historical"))
    count_relations(counts, group)


def count_sense(counts, sense):
    counts["senses"] += 1
    counts["examples"] += len(sense.get("examples", []))
    count_relations(counts, sense)


def report_coverage(store, packs):
    from .store import coverage_scope

    metadata = store.release_metadata()
    result = {"coverage": coverage_scope(metadata), "installed": store.report(), "sources": {},
              "warnings": [], "offline": None}
    for source, info in metadata.items():
        counts = Counter()
        for table, metric in (("source_records", "source_records"), ("lexemes", "headwords")):
            aggregate = "count(DISTINCT headword)" if table == "lexemes" else "count(*)"
            counts[metric] = store.query(f"SELECT {aggregate} FROM {table} WHERE source=? AND version=?",
                                        (source, info["version"])).fetchone()[0]
        for kind in ("form", "variant"):
            counts[kind + "_mappings"] = store.query("""
                SELECT count(*) FROM forms f WHERE source=? AND version=? AND kind=?
            """, (source, info["version"], kind)).fetchone()[0]
        if source == "oewn":
            counts["synsets"] = store.query("""
                SELECT count(*) FROM source_records WHERE source=? AND version=? AND substr(raw,1,7)='<Synset'
            """, (source, info["version"])).fetchone()[0]
        for table, collect in (("lexemes", count_group), ("senses", count_sense)):
            # Named PostgreSQL cursors prevent the driver buffering a release in RAM.
            cursor = store.connection.cursor(name="open_dict_coverage") if store.postgres else store.connection.cursor()
            try:
                cursor.execute(f"SELECT metadata FROM {table} WHERE source=" + ("%s AND version=%s" if store.postgres else "? AND version=?"),
                               (source, info["version"]))
                for (value,) in cursor:
                    collect(counts, json.loads(value))
            finally:
                cursor.close()

        counts["retrievable_headwords"] = store.query("""
            SELECT count(DISTINCT l.headword) FROM lexemes l WHERE source=? AND version=? AND EXISTS (
                SELECT 1 FROM senses s WHERE s.source=l.source AND s.version=l.version AND s.lexeme_id=l.id)
        """, (source, info["version"])).fetchone()[0]
        if store.postgres:
            counts["definition_index_rows"] = counts["senses"] if store.query("""
                SELECT i.indisvalid AND i.indisready FROM pg_index i
                WHERE i.indexrelid=to_regclass('senses_fts')
            """).fetchone() == (True,) else None
        else:
            counts["definition_index_rows"] = store.query(
                "SELECT count(*) FROM senses_fts WHERE source=? AND version=?", (source, info["version"])).fetchone()[0]
        if counts["definition_index_rows"] != counts["senses"] or counts["headwords"] != counts["retrievable_headwords"]:
            result["warnings"].append(f"{source}: lexical and searchable counts differ")
        if info.get("fixture") or info.get("subset"):
            result["warnings"].append(f"{source}: only a subset is active")
        reasons = {k: info.get("report", {}).get(k, 0) for k in REJECTION_REASONS}
        result["sources"][source] = {**dict(counts), "version": info["version"], "checksum": info["checksum"],
                                     "license": info["license"], "completed_at": info.get("completedAt"),
                                     "status": "subset" if info.get("subset") else "active",
                                     "import": info.get("report", {}), "rejected": sum(reasons.values()),
                                     "rejection_reasons": reasons}
    result["retrievable_headwords"] = store.query("""
        SELECT count(DISTINCT l.headword) FROM lexemes l JOIN active_releases a USING(source,version)
        WHERE EXISTS (SELECT 1 FROM senses s WHERE s.source=l.source AND s.version=l.version AND s.lexeme_id=l.id)
    """).fetchone()[0]
    # Older databases can be audited before applying the new migration.
    if store.postgres:
        has_checkpoints = store.query("SELECT to_regclass('import_checkpoints') IS NOT NULL").fetchone()[0]
    else:
        has_checkpoints = store.query("SELECT 1 FROM sqlite_master WHERE name='import_checkpoints'").fetchone()
    if has_checkpoints:
        for source, version, count, time in store.query("SELECT source,version,records,updated_at FROM import_checkpoints"):
            result["warnings"].append(f"{source} {version}: incomplete import with {count:,} archived rows at {time}")
    manifest = packs / "manifest.json"
    if manifest.is_file():
        data = json.loads(manifest.read_text(encoding="utf-8"))
        exported = {source: (info.get("checksum"), info["version"]) for source, info in data["sources"].items()}
        installed = {source: (info["checksum"], info["version"]) for source, info in metadata.items()}
        if exported != installed:
            result["warnings"].append("The pack manifest represents a different active source snapshot")
        for name, edition in data["editions"].items():
            if name in {"Complete English", "Scholarly Research"} and any(
                    edition.get(field, result["installed"][field]) != result["installed"][field]
                    for field in ("headwords", "lexemes", "senses")):
                result["warnings"].append(f"{name}: pack and database counts differ")
            missing = sum(not (packs / file["path"]).is_file() or (packs / file["path"]).stat().st_size != file["bytes"]
                          for file in edition["files"])
            if missing:
                result["warnings"].append(f"{name}: {missing} missing or truncated pack files")
        result["offline"] = {"release": data["release"], "coverage": data.get("coverage", "unclassified"),
            "sources": {name: {"version": info["version"], "license": info["license"]}
                        for name, info in data["sources"].items()},
            "editions": {name: {**{k: v for k, v in edition.items() if k != "files"},
                                "decoded_bytes": sum(file["decodedBytes"] for file in edition["files"])}
                        for name, edition in data["editions"].items()}}
    return result
