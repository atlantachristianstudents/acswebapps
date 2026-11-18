CREATE TABLE IF NOT EXISTS schema_migrations (
    version INTEGER PRIMARY KEY
);
INSERT INTO schema_migrations(version) VALUES (1) ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS releases (
    source TEXT NOT NULL,
    version TEXT NOT NULL,
    checksum TEXT NOT NULL,
    metadata TEXT NOT NULL,
    PRIMARY KEY (source, version)
);
CREATE TABLE IF NOT EXISTS active_releases (
    source TEXT PRIMARY KEY,
    version TEXT NOT NULL,
    FOREIGN KEY (source, version) REFERENCES releases(source, version)
);
CREATE TABLE IF NOT EXISTS source_records (
    source TEXT NOT NULL,
    version TEXT NOT NULL,
    record_id TEXT NOT NULL,
    raw TEXT NOT NULL,
    PRIMARY KEY (source, version, record_id),
    FOREIGN KEY (source, version) REFERENCES releases(source, version)
);
CREATE TABLE IF NOT EXISTS lexemes (
    source TEXT NOT NULL,
    version TEXT NOT NULL,
    id TEXT NOT NULL,
    spelling TEXT NOT NULL,
    headword TEXT NOT NULL,
    pos TEXT NOT NULL,
    record_id TEXT NOT NULL,
    metadata TEXT NOT NULL,
    PRIMARY KEY (source, version, id),
    FOREIGN KEY (source, version, record_id) REFERENCES source_records(source, version, record_id)
);
CREATE INDEX IF NOT EXISTS lexemes_lookup ON lexemes(headword, source, version, pos);
CREATE TABLE IF NOT EXISTS senses (
    source TEXT NOT NULL,
    version TEXT NOT NULL,
    id TEXT NOT NULL,
    lexeme_id TEXT NOT NULL,
    source_id TEXT,
    parent_id TEXT,
    ordinal INTEGER NOT NULL,
    definition TEXT NOT NULL,
    metadata TEXT NOT NULL,
    PRIMARY KEY (source, version, id),
    FOREIGN KEY (source, version, lexeme_id) REFERENCES lexemes(source, version, id)
);
CREATE INDEX IF NOT EXISTS senses_lexeme ON senses(source, version, lexeme_id, ordinal);
CREATE INDEX IF NOT EXISTS senses_permalink ON senses(id);
CREATE TABLE IF NOT EXISTS forms (
    source TEXT NOT NULL,
    version TEXT NOT NULL,
    term TEXT NOT NULL,
    headword TEXT NOT NULL,
    kind TEXT NOT NULL,
    PRIMARY KEY(source, version, term, headword, kind),
    FOREIGN KEY (source, version) REFERENCES releases(source, version)
);
CREATE INDEX IF NOT EXISTS forms_lookup ON forms(term, headword, source, version);
CREATE INDEX IF NOT EXISTS forms_by_headword ON forms(headword, source, version, term);
CREATE TABLE IF NOT EXISTS editorial_reviews (
    id TEXT PRIMARY KEY,
    left_source TEXT NOT NULL,
    left_version TEXT NOT NULL,
    left_sense TEXT NOT NULL,
    right_source TEXT NOT NULL,
    right_version TEXT NOT NULL,
    right_sense TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('candidate', 'pending', 'verified', 'rejected', 'superseded')),
    rationale TEXT NOT NULL,
    reviewer TEXT,
    recorded_at TEXT NOT NULL,
    FOREIGN KEY (left_source, left_version, left_sense) REFERENCES senses(source, version, id),
    FOREIGN KEY (right_source, right_version, right_sense) REFERENCES senses(source, version, id)
);
