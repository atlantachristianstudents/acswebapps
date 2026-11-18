# Open Dictionary roadmap

## Integrated beta

- [x] ACS Web Apps directory registration, relative routes, and scoped application cache
- [x] Authentic starter lookup with separate Wiktionary etymologies and WordNet synsets
- [x] Word comparison, source and license inspection, keyboard autocomplete, and shareable sense links
- [x] Click-to-define links in dictionary prose with keyboard and offline support
- [x] Relational schema, SQLite FTS5, PostgreSQL trigram and full-text indexes, and read-only API
- [x] Server-rendered entries and configurable XML sitemaps on the API-backed edition
- [x] Make complete imports the default for API and Compose, add resumable ingestion, and expose corpus coverage in the app.
- [x] Enable full static lookup from release shards and exhaustive prefix paging.
- [ ] Publish the full release artifacts to the production app origin. The current public Pages endpoint has no release manifest.

## Lexical sources and editorial work

- [x] Streaming Wiktextract JSONL/GZIP and WordNet LMF import, with source checksums and release history
- [x] Distinct source sense identities, available Wiktionary sense paths, explicit forms, labels, and WordNet relation targets
- [ ] Assign persistent aliases for Wiktionary senses whose text or source section identifiers change.
- [x] Record conservative cross-source review candidates without merging senses.
- [ ] Add an editorial review interface and a human-reviewed sense alignment evaluation set.
- [x] Import the 1913 Webster transcription with historical display, source attribution, and conservative sense segmentation.
- [x] Individually verify and bundle three licensed pronunciation recordings.
- [ ] Audit additional Commons recordings and dated quotations. Audio links and original-record preservation support that work.
- [ ] Add a licensed spelling or frequency list and a corpus evidence pipeline. Validate cross-reference coverage and add quality reports across releases.

## Offline and platform work

- [x] Scoped PWA shell and chunked, checksum-verified IndexedDB pack downloads
- [x] Essential and Complete exports with measured transfer sizes, atomic activation, and retention of the previous working edition
- [x] Install the full combined Complete pack in Chromium and verify disconnected lookup and corrupt replacement recovery.
- [ ] Publish and test full-sized packs on iOS, iPadOS, Android, and other desktop browsers. Compare IndexedDB performance and storage with other browser persistence options.
- [x] Export Scholarly Research packs with licensed source excerpts and Wiktionary quotation citations.
- [x] Export portable normalized SQLite databases with FTS indexes and verified manifests.
- [ ] Build Tauri installers for macOS, Windows, and Linux. Verify native search with the network disconnected.
- [ ] Run the Docker composition on a Docker host and test a complete air-gapped container install. PostgreSQL migrations, API integration, and local pack tests exercise the same application code.
- [ ] Add a full WCAG 2.2 AA audit and broader device testing.
