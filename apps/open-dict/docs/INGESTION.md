# Ingestion and releases

Run these commands from `apps/open-dict`. Use the default SQLite file `.local/full.sqlite`, set `OPEN_DICT_DATABASE_URL` for a dedicated PostgreSQL database, or pass `--db` before the subcommand.

```sh
python3 -m lexical.build download .local/raw
python3 -m lexical.build import-all .local/raw
python3 -m lexical.build coverage
python3 -m lexical.build release data/releases --id english-2026-11-18-r2 \
  --essential-words data/fixtures/headwords.txt --scholarly
```

The [source registry](../data/sources.json) pins the archive URLs, filenames, byte sizes, licenses, and SHA-256 hashes. The download command resumes a verified-size `.partial` transfer until it can verify and activate the archive. It reuses a matching local archive. The [Kaikki raw download](https://kaikki.org/dictionary/rawdata.html) is mutable. Record the upstream snapshot, digest, and independent source counts when advancing to a different Wiktextract release. The importer reads only actual `lang_code == "en"` entries and archives the raw English records, including entries it cannot assign a sourced gloss.

The importer stages batches and commits checkpoints without activating an unfinished source. Run the same `import-all` command again after an interruption. The importer verifies the archive checksum and replays the source stream through the saved boundary to reconstruct IDs, then continues inserting at the checkpoint. The importer logs scanned input, archived rows, lexemes, senses, rejected records, and remaining input when the archive has a measured baseline. Invalid JSON aborts with its input line number. Completed, audited source releases are reused on re-import. The first import after upgrading a legacy database stages a new normalization revision for any pinned source loaded before checkpoint and coverage tracking. Use a fresh version ID for changed bytes, a different selection, or a deliberate normalization rebuild.

The standalone `import` subcommand accepts a local source archive and an explicit version. `--words` enables a development selection and marks the release as a subset. Full `import-all` takes the three pinned archives and has no vocabulary selection. The API and browser exporter require completed archives with matching pinned hashes and source audit counts to label coverage as full. WordNet uses a temporary disk index to resolve forward references. Webster archives recognizable entries without a usable marked definition and reports the exclusion from search.

To rebuild and check search indexes, run `python3 -m lexical.build reindex` and then `python3 -m lexical.build coverage`. Rebuilding SQLite FTS rewrites the index. Allow temporary disk space and schedule it outside heavy import activity. The coverage command reports active revisions and source counts, missing or mismatched indexes, incomplete checkpoints, pack coverage, and missing or truncated static search shards. See the [coverage audit](VOCABULARY_COVERAGE.md).

The pack exporter writes all editions, optional source evidence, and the online form index into an atomic version directory. Each edition reports actual headwords, lexemes, senses, fields, and compressed bytes. Complete and Scholarly use every active searchable key. For test fixtures, explicitly pass `release ... --allow-partial`. Publish the manifest and its version directory together. Include source notices and keep generated artifacts outside Git. See [Offline](OFFLINE.md).

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

Run `python3 -m lexical.build --db .local/full.sqlite portable .local/portable --id english-2026-10`. This writes a gzip-compressed SQLite database and its JSON manifest with SHA-256, compressed and installed bytes, schema, counts, and source metadata. The portable artifact contains normalized licensed evidence. Keep the original input archives and authoritative database independently. A native application can open the extracted SQLite database directly. Use `--allow-partial` for a portable development selection, which is labeled in the manifest.

## Review candidates

Run `python3 -m lexical.alignment --db .local/full.sqlite sense bank` to record candidate Wiktionary/WordNet alignments for selected words. It requires an unambiguous, matching normalized source gloss and part of speech with compatible historical tags. These results are review candidates only. They leave the published source sense records and compare view intact.
