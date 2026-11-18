"""Relational storage and read queries shared by SQLite and PostgreSQL."""
from contextlib import contextmanager
from itertools import groupby
from pathlib import Path
import json
import re
import sqlite3

from .model import SCHEMA, SOURCES, key

ROOT = Path(__file__).resolve().parents[1]


def sources():
    data = json.loads((ROOT / "data/sources.json").read_text(encoding="utf-8"))
    for source in data.values():
        source["noticeText"] = [(ROOT / name).read_text(encoding="utf-8") for name in source.get("notices", [])]
    return data


def audited_release(metadata):
    report = metadata.get("report", {})
    return bool(metadata.get("completedAt") and report.get("senses") and metadata.get("sha256") and
                metadata.get("checksum") == metadata["sha256"] and
                all(report.get(field) == value for field, value in metadata.get("baseline", {}).items()))


def coverage_scope(metadata):
    if not metadata:
        return "empty"
    if all(item.get("fixture") for item in metadata.values()):
        return "starter"
    if not SOURCES.issubset(metadata) or not all(
            not item.get("subset") and not item.get("fixture") and audited_release(item)
            for item in metadata.values()):
        return "partial"
    return "full"


@contextmanager
def connect(database, read_only=False, *, statement_timeout="20s"):
    postgres = str(database).startswith(("postgresql://", "postgres://"))
    if postgres:
        import psycopg
        connection = psycopg.connect(database, connect_timeout=5)
        if read_only:
            connection.execute("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY")
        connection.execute("SELECT set_config('statement_timeout', %s, false)", (statement_timeout,))
    else:
        source = Path(database).resolve().as_uri() + "?mode=ro" if read_only else database
        connection = sqlite3.connect(source, uri=read_only)
        connection.execute("PRAGMA foreign_keys = ON")
        if read_only:
            connection.execute("BEGIN")
    try:
        with connection:
            yield Store(connection, postgres)
    finally:
        connection.close()


class Store:
    def __init__(self, connection, postgres):
        self.connection = connection
        self.postgres = postgres

    def query(self, sql, args=()):
        return self.connection.execute(sql.replace("?", "%s") if self.postgres else sql, args)

    def many(self, sql, rows):
        if self.postgres:
            with self.connection.cursor() as cursor:
                cursor.executemany(sql.replace("?", "%s"), rows)
        else:
            self.connection.executemany(sql, rows)

    def initialize(self):
        schema = (ROOT / "lexical/schema.sql").read_text(encoding="utf-8")
        if self.postgres:
            self.connection.execute(schema)
            self.connection.execute("""
                CREATE EXTENSION IF NOT EXISTS pg_trgm;
                CREATE INDEX IF NOT EXISTS lexemes_trigram ON lexemes USING gin (headword gin_trgm_ops);
                CREATE INDEX IF NOT EXISTS lexemes_prefix ON lexemes(headword text_pattern_ops);
                CREATE INDEX IF NOT EXISTS senses_fts ON senses USING gin (to_tsvector('english', definition));
            """)
        else:
            self.connection.executescript(schema)
            self.connection.execute("""
                CREATE VIRTUAL TABLE IF NOT EXISTS senses_fts USING fts5(definition, sense_id UNINDEXED,
                    source UNINDEXED, version UNINDEXED, tokenize='unicode61')
            """)

    def release_metadata(self):
        return {source: json.loads(metadata) for source, metadata in self.query("""
            SELECT r.source,r.metadata FROM releases r JOIN active_releases a USING(source,version)
        """)}

    def entries(self):
        sql = """
            SELECT l.headword,l.id,l.version,l.metadata,s.metadata
            FROM lexemes l JOIN active_releases a USING(source,version)
            JOIN senses s ON s.source=l.source AND s.version=l.version AND s.lexeme_id=l.id
            ORDER BY l.headword,l.id,s.ordinal
        """
        form_rows = self.connection.cursor(name="open_dict_forms") if self.postgres else self.connection.cursor()
        cursor = self.connection.cursor(name="open_dict_entries") if self.postgres else self.connection.cursor()
        try:
            form_rows.execute("""
                SELECT DISTINCT headword,term,kind FROM forms JOIN active_releases USING(source,version)
                ORDER BY headword,term,kind
            """)
            alias_groups = iter(groupby(form_rows, key=lambda row: row[0]))
            aliases = next(alias_groups, None)
            cursor.execute(sql)
            for word, paragraphs in groupby(cursor, key=lambda row: row[0]):
                groups = []
                for _, rows in groupby(paragraphs, key=lambda row: row[1]):
                    first = next(rows)
                    group = json.loads(first[3])
                    group["version"] = first[2]
                    group["senses"] = [json.loads(first[4])] + [json.loads(row[4]) for row in rows]
                    groups.append(group)
                groups.sort(key=self.group_order)
                while aliases and aliases[0] < word:
                    aliases = next(alias_groups, None)
                terms = [[term, kind] for _, term, kind in aliases[1]] if aliases and aliases[0] == word else []
                yield {"key": word, "word": groups[0]["word"], "groups": groups, "aliases": terms}
        finally:
            cursor.close()
            form_rows.close()

    @staticmethod
    def group_order(group):
        origin = str(group.get("origin") or "0")
        priority = {"wiktionary": 0, "oewn": 1, "webster1913": 2}
        return (group["word"] != key(group["word"]), priority.get(group["source"], 3), group["word"],
                int(origin) if origin.isdigit() else 0)

    def lookup(self, word):
        groups = {}
        for source, version, lexeme_id, metadata in self.query("""
            SELECT l.source,l.version,l.id,l.metadata FROM lexemes l JOIN active_releases a USING(source,version)
            WHERE headword=? ORDER BY CASE l.source WHEN 'wiktionary' THEN 0 ELSE 1 END, l.spelling, l.id
        """, (key(word),)):
            group = json.loads(metadata)
            group["version"] = version
            group["senses"] = []
            groups[(source, version, lexeme_id)] = group
        for source, version, lexeme_id, metadata in self.query("""
            SELECT s.source,s.version,s.lexeme_id,s.metadata FROM lexemes l JOIN active_releases a USING(source,version)
            JOIN senses s ON s.source=l.source AND s.version=l.version AND s.lexeme_id=l.id
            WHERE l.headword=? ORDER BY s.ordinal
        """, (key(word),)):
            groups[(source, version, lexeme_id)]["senses"].append(json.loads(metadata))
        if not groups:
            return None
        rows = sorted(groups.values(), key=self.group_order)
        aliases = self.query("""
            SELECT DISTINCT term,kind FROM forms f JOIN active_releases a USING(source,version)
            WHERE headword=? ORDER BY term,kind
        """, (key(word),))
        return {"key": key(word), "word": rows[0]["word"], "groups": rows,
                "aliases": [list(row) for row in aliases]}

    def sense(self, sense_id):
        row = self.query("""
            SELECT s.metadata,l.spelling,s.source,s.version FROM senses s JOIN active_releases a USING(source,version)
            JOIN lexemes l ON l.source=s.source AND l.version=s.version AND l.id=s.lexeme_id WHERE s.id=?
        """, (sense_id,)).fetchone()
        if row:
            return {**json.loads(row[0]), "word": row[1], "source": row[2], "version": row[3]}
        return None

    def search(self, word, limit, filters=None, suggest=False):
        filters = filters or {}
        word = key(word)
        clauses, criteria = [], []
        for name, column in (("pos", "l.pos"), ("source", "l.source")):
            if filters.get(name):
                clauses.append(column + "=?")
                criteria.append(filters[name])
        if filters.get("ending"):
            clauses.append("substr(l.headword,-?)=?" if not self.postgres else "right(l.headword,?)=?")
            value = key(filters["ending"])
            criteria.extend([len(value), value])
        if filters.get("beginning"):
            value = key(filters["beginning"])
            clauses.append("l.headword>=? AND l.headword<?")
            criteria.extend([value, value + "\U0010ffff"])
        sense_clauses, sense_args = [], []
        sense_from = "senses s"
        for name, field in (("label", "labels"), ("domain", "domains")):
            if not filters.get(name):
                continue
            if self.postgres:
                values = f"jsonb_array_elements_text(s.metadata::jsonb -> '{field}') AS value"
                test = "strpos(lower(value),?)>0"
            else:
                values = f"json_each(s.metadata,'$.{field}')"
                test = "instr(lower(value),?)>0"
            sense_clauses.append(f"EXISTS(SELECT 1 FROM {values} WHERE {test})")
            sense_args.append(key(filters[name]))
        if filters.get("definition"):
            if self.postgres:
                sense_clauses.append("to_tsvector('english',s.definition) @@ plainto_tsquery('english',?)")
                tokens = filters["definition"]
            else:
                tokens = " ".join('"' + token + '"' for token in re.findall(r"[^\W_]+", filters["definition"]))
                if not tokens:
                    return []
                sense_from = """senses_fts JOIN senses s ON s.id=senses_fts.sense_id
                    AND s.source=senses_fts.source AND s.version=senses_fts.version"""
                sense_clauses.append("senses_fts MATCH ?")
            sense_args.append(tokens)
        if sense_clauses:
            clauses.append(f"""(l.source,l.version,l.id) IN (SELECT s.source,s.version,s.lexeme_id
                FROM {sense_from} JOIN active_releases a ON a.source=s.source AND a.version=s.version
                WHERE """ + " AND ".join(sense_clauses) + ")")
            criteria.extend(sense_args)
        condition = " AND " + " AND ".join(clauses) if clauses else ""
        rows = {}

        def collect(match, args, kind, order="l.headword"):
            for term, spelling in self.query(f"""
                SELECT l.headword,COALESCE(min(CASE WHEN l.spelling=l.headword THEN l.spelling END),min(l.spelling))
                FROM lexemes l JOIN active_releases a USING(source,version)
                WHERE {match}{condition} GROUP BY l.headword ORDER BY {order} LIMIT ?
            """, (*args, *criteria, limit - len(rows) + (1 if kind == "prefix" else 0))):
                rows.setdefault(term, {"word": spelling, "key": term, "kind": kind})

        if not word:
            collect("1=1", [], "filter")
            return list(rows.values())[:limit]
        collect("l.headword=?", [word], "exact")
        for kind in ("form", "variant"):
            if len(rows) >= limit:
                break
            collect("""l.headword IN (SELECT f.headword FROM forms f JOIN active_releases b USING(source,version)
                       WHERE f.term=? AND f.kind=?)""", [word, kind], kind)
        if len(rows) < limit:
            collect("l.headword>=? AND l.headword<?", [word, word + "\U0010ffff"], "prefix")
        if len(rows) < limit and not suggest and 2 <= len(word) <= 48:
            prefixes = {word[:3], word[0] + word[2:4]}
            for i in range(min(3, len(word) - 1)):
                prefixes.add((word[:i] + word[i + 1] + word[i] + word[i + 2:])[:3])
            candidates = set()
            for prefix in prefixes:
                candidates.update(row[0] for row in self.query("""
                    SELECT DISTINCT l.headword FROM lexemes l JOIN active_releases a USING(source,version)
                    WHERE l.headword>=? AND l.headword<? ORDER BY l.headword LIMIT 600
                """, (prefix, prefix + "\U0010ffff")))
            if self.postgres:
                candidates.update(row[0] for row in self.query("""
                    SELECT l.headword FROM lexemes l JOIN active_releases a USING(source,version)
                    WHERE l.headword %% ? GROUP BY l.headword
                    ORDER BY similarity(l.headword,?) DESC,l.headword LIMIT 400
                """, (word, word)))
            ranked = sorted((distance(word, term), term) for term in candidates
                            if term not in rows and abs(len(word) - len(term)) <= 2)
            for cost, term in ranked:
                if cost > (1 if len(word) < 6 else 2) or len(rows) >= limit:
                    break
                collect("l.headword=?", [term], "suggestion")
        return list(rows.values())[:limit]

    def browse(self, prefix, after, limit):
        prefix, after = key(prefix), key(after)
        bounds = ["l.headword>?"]
        args = [after]
        if prefix:
            bounds.append("l.headword>=? AND l.headword<?")
            args.extend((prefix, prefix + "\U0010ffff"))
        rows = self.query(f"""
            SELECT l.headword,COALESCE(min(CASE WHEN l.spelling=l.headword THEN l.spelling END),min(l.spelling))
            FROM lexemes l JOIN active_releases a USING(source,version)
            WHERE {" AND ".join(bounds)} GROUP BY l.headword ORDER BY l.headword LIMIT ?
        """, (*args, limit + 1)).fetchall()
        return {"results": [{"word": spelling, "key": term, "kind": "prefix"} for term, spelling in rows[:limit]],
                "next": rows[limit - 1][0] if len(rows) > limit else None}

    def rebuild_indexes(self):
        if self.postgres:
            for index in ("lexemes_lookup", "lexemes_trigram", "lexemes_prefix",
                          "senses_lexeme", "senses_permalink", "senses_fts", "forms_lookup", "forms_by_headword"):
                self.connection.execute(f"REINDEX INDEX {index}")
            for table in ("lexemes", "senses", "forms"):
                self.connection.execute(f"ANALYZE {table}")
        else:
            self.connection.execute("DELETE FROM senses_fts")
            self.connection.execute("INSERT INTO senses_fts SELECT definition,id,source,version FROM senses")
            self.connection.execute("INSERT INTO senses_fts(senses_fts) VALUES ('integrity-check')")
            self.connection.execute("REINDEX")
            self.connection.execute("ANALYZE")

    def report(self):
        counts = {}
        for table in ("lexemes", "senses", "source_records", "forms"):
            counts[table] = self.query(
                f"SELECT count(*) FROM {table} JOIN active_releases USING(source,version)"
            ).fetchone()[0]
        counts["headwords"] = self.query(
            "SELECT count(DISTINCT headword) FROM lexemes JOIN active_releases USING(source,version)"
        ).fetchone()[0]
        counts["schema"] = SCHEMA
        return counts


def distance(left, right):
    previous, before_previous = list(range(len(right) + 1)), None
    for i, a in enumerate(left, 1):
        row = [i]
        for j, b in enumerate(right, 1):
            value = min(row[-1] + 1, previous[j] + 1, previous[j - 1] + (a != b))
            if i > 1 and j > 1 and a == right[j - 2] and left[i - 2] == b:
                value = min(value, before_previous[j - 2] + 1)
            row.append(value)
        before_previous, previous = previous, row
    return previous[-1]
