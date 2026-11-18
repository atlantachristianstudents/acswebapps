# Open Dictionary

Open Dictionary is a free English reference built from English Wiktionary, Open English WordNet, and the 1913 Webster historical transcription. It preserves the sources’ independent senses, parts of speech, homographs, glosses, and available examples, pronunciations, etymologies, and relations. The bundled starter has **225 headwords, 598 source entries, and 3,844 source senses**.

The ACS Web Apps route is [`/apps/open-dict/`](https://acswebapps.com/apps/open-dict/) after the parent repository publishes this app. GitHub Pages serves the starter and any pack artifacts operators publish at that route. The optional Python API serves the same UI with the imported dictionary, server-rendered entry pages, and PostgreSQL or SQLite search.

## Run locally

From the ACS Web Apps repository root, run `python3 -m http.server 8765 --bind 127.0.0.1` and open [Open Dictionary](http://127.0.0.1:8765/apps/open-dict/). The starter also opens directly from `apps/open-dict/index.html`. For local service workers and installed data, use a loopback HTTP address or HTTPS.

For the same-origin API and a starter SQLite database, run these commands from `apps/open-dict`. Use Python 3.9 or newer with SQLite FTS5.

```sh
python3 -m lexical.build seed
python3 -m api.server
```

Then open [the local API-backed app](http://127.0.0.1:8766/). For full data, follow [Ingestion](docs/INGESTION.md). The verified combined import contains 1,403,043 normalized headword keys and 2,138,869 source senses. For PostgreSQL, Docker, reverse-proxy hosting, backups, or disconnected operation, follow [Deployment](docs/DEPLOYMENT.md).

## Use the dictionary

- Press **/** to focus search. Use the arrow keys and Enter to choose an autocomplete match. Search also recognizes available inflected forms and alternate spellings.
- Open **Advanced search** to filter by source, part of speech, spelling, definition, subject, or usage label. Filter results depend on the selected dataset’s coverage.
- Switch **Scholarly mode** on an entry to see both sources, fuller relations, and sense IDs. **Sense link** addresses an individual source sense. Use **Compare** for side-by-side sources and evidence.
- Open **Sources** for versions, licenses, and attribution. Listen to the licensed starter recordings for *bank*, *apple*, and *serendipity*. Other Wiktionary audio records link to the relevant Commons file and its terms. IPA and examples appear wherever present in the selected data.
- Open **Offline** to find installation instructions, check for published packs, and download an edition. The starter works once the app shell finishes caching. See [Offline](docs/OFFLINE.md).

## Read-only API

The backend serves these JSON GET endpoints beneath its configured mount. Search returns up to 50 records with `word`, `key`, and match `kind`.

| Endpoint | Response |
| --- | --- |
| `api/v1/health` | Schema compatibility and whether a release is active |
| `api/v1/lookup/{word}?view=scholarly` | Normalized spelling, source entry groups, senses, and forms |
| `api/v1/search?q=&limit=` | Ranked search with optional `pos`, `source`, `beginning`, `ending`, `definition`, `label`, and `domain` |
| `api/v1/suggest?q=&limit=` | Exact, recognized-form, variant, and prefix matches |
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
