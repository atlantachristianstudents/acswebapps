# Testing

Run the app tests from `apps/open-dict` and the parent validator from the repository root.

```sh
python3 -m unittest discover -s tests -v
python3 -m lexical.build seed
python3 -m tests.benchmark .local/open-dict.sqlite
```

The default integration suite creates a temporary SQLite database from the starter. It collects distinct source senses for difficult words and exercises morphology, JSON API, parameter validation, atomic import failure, source licensing, server-rendered pages, sitemaps, and pack hashes. To run the same tests against PostgreSQL, set `OPEN_DICT_TEST_POSTGRES` to a dedicated empty test database with UTF-8 encoding and C collation. The tests create dictionary records in that database.

For end-to-end PWA verification, generate a local release with both editions and start a static server from the repository root.

```sh
python3 -m lexical.build release data/releases --id browser-test-v1 \
  --essential-words data/fixtures/wiktionary-headwords.txt
```

Use a fresh, dedicated Chromium profile started with `--remote-debugging-port=8767` and a loopback-only debugging address. Run `node tests/browser.mjs http://127.0.0.1:8765/apps/open-dict/` from the app directory with Node 22 or newer. It checks keyboard autocomplete, sense links, mode switching, history, a phone-sized layout, verified pack installation, a corrupted replacement, and lookup after network disconnection and HTTP cache clearing. Change the release ID or use a fresh profile when re-running installation checks.

The benchmark measures warm database calls without HTTP or UI rendering. Treat its sample size and selected query mix as part of every reported result. Verify touch installation, storage pressure, and screen-reader behavior on the target platforms before claiming broad compatibility.


## Measured development results

On the development Mac, the full Open English WordNet 2025 import contained 127,311 distinct headwords, 135,969 source lexemes and 185,129 lexical senses. Its Complete browser pack was 47,202,987 compressed bytes. The SQLite benchmark, using the bundled query mix, measured median search at 0.13 ms and median autocomplete at 0.11 ms. Search p95 was 8.86 ms across 45 calls. These are in-process query measurements on the stated data.

The combined SQLite import contained 1,403,043 normalized headword keys, 1,748,903 source lexemes, and 2,138,869 source senses. Against that import, the benchmark measured a 0.29 ms median and 12.20 ms p95 for 45 searches, and a 0.14 ms median for autocomplete. A separate Chromium run installed the full 127,311-headword WordNet pack and looked up a word outside the starter after disconnecting.

The final starter PostgreSQL database was restored from a logical backup into an empty database, where all 3,844 senses were present.


The combined release `english-2026-11-18` passed SHA-256, gzip length, and record count verification for every chunk.

| Edition | Headword keys | Compressed bytes | Decoded bytes |
| --- | ---: | ---: | ---: |
| Essential English | 233 | 750,731 | 3,409,194 |
| Complete English | 1,403,043 | 260,792,964 | 1,462,478,163 |
| Scholarly Research | 1,403,043 | 348,290,489 | 2,178,931,540 |

Decoded bytes measure the package content before browser storage and indexing.


Chromium installed the full Complete English pack in 243.9 seconds from a loopback server on the development Mac. Its storage API estimated an increase of 978,601,284 bytes for the installed pack and indexes. The pack survived a service-worker upgrade. After disabling networking and clearing the HTTP cache, Chromium reloaded the app, looked up an entry outside the starter, displayed etymology, and followed an alternate spelling. A mixed-case headword case verified that the common word and the proper name retained separate source groups.
