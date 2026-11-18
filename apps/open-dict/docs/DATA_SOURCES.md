# Data sources

The [source registry](../data/sources.json) records the release, download URL, observed SHA-256, and reuse terms for each imported source.

| Resource | Use |
| --- | --- |
| [English Wiktionary via Kaikki.org](https://kaikki.org/dictionary/English/) | The starter selection came from the per-word Wiktextract exports built on October 30, 2026, from the October 1, 2026 English Wiktionary dump. The importer also accepts the upstream raw JSONL export and selects English records by language code. |
| [Open English WordNet 2025](https://en-word.net/downloads) | Global WordNet LMF provides source lexical senses, synsets, glosses, examples, and typed semantic links. This release is the 2025 common-lexeme edition. |
| [Webster's Unabridged Dictionary, Gutenberg #29765](https://www.gutenberg.org/ebooks/29765) | Historical transcription cataloged as public domain in the US. The 2025-07-06 text is pulled from the official project mirror and parsed at marked headword and sense boundaries. The transcription has known defects and coverage gaps. The original snapshots identify the source and version. |
| [GCIDE XML](https://www.ibiblio.org/webster/) | An alternative Webster-derived dataset with later editorial material and GPL terms. Any integration must distinguish those additions and preserve its own licensing. |
| [English Speller Database / SCOWL](https://github.com/en-wl/wordlist) | Candidate for regional spellings and broader spelling coverage. Its constituent notices need to travel with any distribution. |

The bundled selection lists are editorial coverage choices including all 17 difficult regression words. The lists are independent of corpus frequency. Corpus ingest and dedicated dated quotation extraction are pending. Scholarly Research can show Wiktionary’s available bibliographic references and original Webster source passages. Individual editions, rights, and metadata need verification before a text collection can support attestation or frequency analysis. No first-use date is inferred from a corpus occurrence.
