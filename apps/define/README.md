# Define

Define is a free English reference built from English Wiktionary, Open English WordNet, and the 1913 Webster historical transcription. It preserves the sources’ independent senses, parts of speech, homographs, glosses, and available examples, pronunciations, etymologies, and relations. The bundled starter has **225 headwords, 598 source entries, and 3,844 source senses**.

The ACS Web Apps route is [`/apps/define/`](https://acswebapps.com/apps/define/). Static hosts can serve full dictionary lookup and search directly from published release shards. The Python API also serves the same UI with SQLite or PostgreSQL search and server-rendered entries. The page identifies its active data source and explicitly labels starter coverage.

## Run locally

From the ACS Web Apps repository root, run `python3 -m http.server 8765 --bind 127.0.0.1` and open [Define](http://127.0.0.1:8765/apps/define/). The starter also opens directly from `apps/define/index.html`. For local service workers and installed data, use a loopback HTTP address or HTTPS.

For a complete local deployment, run these commands from `apps/define` with Python 3.9+ and SQLite FTS5.

```sh
python3 -m lexical.build download .local/raw
python3 -m lexical.build import-all .local/raw
python3 -m lexical.build coverage
python3 -m api.server
```

Then open [the full local app](http://127.0.0.1:8766/). For a small development database, run `python3 -m lexical.build --db .local/dev.sqlite seed` and start `python3 -m api.server --db .local/dev.sqlite --allow-partial`. The production API requires all three complete source imports by default. See [Ingestion](docs/INGESTION.md), [Vocabulary coverage](docs/VOCABULARY_COVERAGE.md), and [Deployment](docs/DEPLOYMENT.md).

## Use the dictionary

- Press **/** to focus search. Use the arrow keys and Enter to choose an autocomplete match. Search also recognizes available inflected forms and alternate spellings.
- Select any word in a definition, example, or etymology to see a quick definition without leaving the entry. Press Escape to return to the word, or choose **Open full entry** to see the rest of its senses. Quick definitions use the installed data when offline.
- Open **Advanced search** to filter by source, part of speech, spelling, definition, subject, or usage label. Filter results depend on the selected dataset’s coverage.
- Switch **Scholarly mode** on an entry to see both sources, fuller relations, and sense IDs. **Sense link** addresses an individual source sense. Use **Compare** for side-by-side sources and evidence.
- Open **Sources** for versions, licenses, and attribution. Listen to the licensed starter recordings for *bank*, *apple*, and *serendipity*. Other Wiktionary audio records link to the relevant Commons file and its terms. IPA and examples appear wherever present in the selected data.
- Open the floating **?** for the theme setting, project links, and **Check for updates**.
- Open **Offline** to find installation instructions, check for published packs, and download an edition. Browsers with Background Fetch can continue a transfer after you close the Define tab. The starter works once the app shell finishes caching. See [Offline](docs/OFFLINE.md).

## Read-only API

The backend serves these JSON GET endpoints beneath its configured mount. Search returns up to 50 records with `word`, `key`, and match `kind`.

| Endpoint | Response |
| --- | --- |
| `api/v1/health` | Schema compatibility and whether a release is active |
| `api/v1/lookup/{word}?view=scholarly` | Normalized spelling, source entry groups, senses, and forms |
| `api/v1/search?q=&limit=` | Ranked search with optional `pos`, `source`, `beginning`, `ending`, `definition`, `label`, and `domain` |
| `api/v1/suggest?q=&limit=` | Exact, recognized-form, variant, and prefix matches |
| `api/v1/browse?prefix=&after=&limit=` | Exhaustive alphabetical pages with `results` and a `next` headword key to pass back as `after` |
| `api/v1/senses/{id}` | A source sense with entry spelling and release |
| `api/v1/senses/{id}/relations` | Available source relations keyed by type |
| `api/v1/sources` | Active source releases, license information, and notices |
| `api/v1/releases` | Published browser-pack manifest or an empty edition list |

Encode path terms and query parameters using standard URL encoding. The API returns JSON errors with an `error` field, including HTTP 400 for invalid inputs, 404 for missing entries and senses, and 429 if the client exceeds the request rate. The app uses query-string entry URLs for server rendering and fragments for client-side navigation.

## Project documentation

- [Architecture](docs/ARCHITECTURE.md) and [data model](docs/DATA_MODEL.md)
- [Data sources](docs/DATA_SOURCES.md), [licensing](docs/LICENSING.md), and [ingestion](docs/INGESTION.md)
- [Search](docs/SEARCH.md), [offline](docs/OFFLINE.md), [deployment](docs/DEPLOYMENT.md), and [testing](docs/TESTING.md)
- [Roadmap](ROADMAP.md) and [contribution guide](CONTRIBUTING.md)

The app code uses the [MIT License](LICENSE). English Wiktionary text carries CC BY-SA 4.0. Open English WordNet carries CC BY 4.0 and the underlying Princeton WordNet notice. Source-level licenses are recorded in [the registry](data/sources.json).

Wider recording coverage, a human-reviewed alignment program, corpus evidence, and native Tauri installers are tracked in the roadmap. The PWA provides the current installable desktop experience.
