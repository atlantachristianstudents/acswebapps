# Ingestion and releases

Run these commands from `apps/open-dict`. The starter works with the public fixture and needs no source downloads. Use a dedicated SQLite path or a PostgreSQL URL passed to `--db` before the subcommand.

```sh
mkdir -p .local/raw
curl -fL --continue-at - https://kaikki.org/dictionary/raw-wiktextract-data.jsonl.gz \
  -o .local/raw/wiktionary.jsonl.gz
curl -fL https://en-word.net/static/english-wordnet-2025.xml.gz \
  -o .local/raw/wordnet.xml.gz
curl -fL --continue-at - https://gutenberg.pglaf.org/cache/epub/29765/pg29765.txt \
  -o .local/raw/webster-29765.txt

python3 -m lexical.build --db .local/full.sqlite import wiktionary .local/raw/wiktionary.jsonl.gz \
  --version '2026-10-01 / Wiktextract 19f9a30'
python3 -m lexical.build --db .local/full.sqlite import oewn .local/raw/wordnet.xml.gz --version 2025
python3 -m lexical.build --db .local/full.sqlite import webster1913 .local/raw/webster-29765.txt \
  --version 'Gutenberg 29765 / 2025-07-06'
python3 -m lexical.build --db .local/full.sqlite report
```

The Kaikki raw download is mutable. Confirm the dump date and Wiktextract commit on the [raw data page](https://kaikki.org/dictionary/rawdata.html) before naming a release. The importer verifies the pinned hashes for the versions in the registry. When selecting a newer release, capture its version, the downloaded SHA-256, and the corresponding license in the registry. Use `--sha256` to enforce an explicit digest. Retain upstream archives separately from Git to reproduce an older release.

The import walks the compressed input incrementally and writes database batches. WordNet uses a temporary disk index for forward references. A transaction activates a source release only after a valid import. Reimporting the same input and selection for the same version reuses its records. Use a fresh version ID for different input bytes or a different selection. Superseded releases stay available in the database for audit. The report distinguishes source records, normalized lexemes, senses, headwords, and forms. Per-source import anomalies appear in release metadata.

Use `--words data/fixtures/headwords.txt` to import a small selection. This consumes the entire input stream to locate entries but only inserts the selected headwords. The committed starter was built from per-word Wiktextract JSONL excerpts and the pinned WordNet LMF archive.

```sh
python3 -m lexical.build --db .local/full.sqlite release data/releases \
  --id english-2026-10 --essential-words data/fixtures/headwords.txt --scholarly
```

The release tool creates immutable compressed chunks and atomically replaces the manifest once all editions finish. Publish all chunks for the release ID alongside its manifest. A publisher can choose a separate Essential headword list. The optional Scholarly Research edition adds selected evidence to records backed by original archives. Include the source notices in any separate redistribution. Keep generated files and databases outside Git. See [Offline](OFFLINE.md).


## Refresh the bundled starter

Use archived per-word Kaikki exports for the historical starter snapshot, or use the full raw extract for a newer selection. Import the displayed selection into a dedicated database and give each subset its own release ID. Import Wiktionary and WordNet with `--words data/fixtures/headwords.txt` and Webster with `--words data/fixtures/webster-headwords.txt`. Then run the fixture exporter.

```sh
python3 -m lexical.build --db .local/starter.sqlite fixture \
  --words data/fixtures/headwords.txt \
  --wiktionary-words data/fixtures/wiktionary-headwords.txt \
  --output data/fixtures/starter.js
```

The fixture includes the date and checksums of its own source inputs. Raw Wiktextract exports and Kaikki’s per-word extracts can differ in formatting and postprocessing. Record which upstream files were used. Update the documented starter counts, rerun both app and repository checks, and advance the app shell version when shipping a new fixture.

## Portable SQLite

Run `python3 -m lexical.build --db .local/full.sqlite portable .local/portable --id english-2026-10`. This writes a gzip-compressed SQLite database and its JSON manifest with SHA-256, compressed and installed bytes, schema, counts, and source metadata. The portable artifact contains normalized licensed evidence. Keep the original input archives and authoritative database independently. A native application can open the extracted SQLite database directly.

## Review candidates

Run `python3 -m lexical.alignment --db .local/full.sqlite sense bank` to record candidate Wiktionary/WordNet alignments for selected words. It requires an unambiguous, matching normalized source gloss and part of speech with compatible historical tags. These results are review candidates only. They leave the published source sense records and compare view intact.
