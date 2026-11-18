# Vocabulary coverage

## Before the repair

The public app page returned HTTP 200 on November 18, 2026. Its same-origin API health endpoint and release manifest both returned HTTP 404. With no installed pack, its frontend could search 225 bundled headword keys and 3,844 senses. The local static server also fell back to the starter even with a complete manifest present. The separate local API on port 8770 used the full database explicitly and returned all eleven requested uncommon words as exact results. Compose initialized a different database with the starter.

| Installed source in the original full SQLite database | Source records | Headword keys | Lexemes | POS records | Senses | Inflection mappings | Etymologies | Pronunciation records | Examples | Synonym edges | Antonym edges | Synsets | Historical entries |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| English Wiktionary | 1,497,827 | 1,360,353 | 1,497,827 | 1,497,827 | 1,793,712 | 732,397 | 537,503 | 436,894 | 98,003 | 727,463 | 54,268 | 0 | 0 |
| Open English WordNet 2025 | 243,488 | 127,311 | 135,969 | 135,969 | 185,129 | 4,447 | 0 | 0 | 104,095 | 285,546 | 7,988 | 107,519 | 0 |
| Webster 1913 | 115,107 | 99,956 | 115,107 | 110,686 | 160,028 | 0 | 53,379 | 0 | 0 | 0 | 0 | 0 | 115,107 |

The union was 1,403,043 headword keys and 2,138,869 senses. SQLite FTS had one row per sense. The starter was a separate 598-lexeme selection. These counts describe the installed revisions. Headword keys overlap across sources. Inflection mappings count observed form-to-headword edges. POS records count lexemes with a known POS. Pronunciations include audio metadata. Webster quotations embedded in definition text do not count as structured examples.


### Starter installation before the repair

| Source | Headword keys | Lexemes and source records | Senses |
| --- | ---: | ---: | ---: |
| Wiktionary | 44 | 124 | 937 |
| WordNet | 224 | 442 | 2,722 |
| Webster | 9 | 32 | 185 |
| Union | 225 | 598 | 3,844 |

Four local PostgreSQL test and restore databases contained 225 headword keys each, with either 3,659 or 3,844 senses depending on their starter revision. The active full local API used SQLite. No dictionary database environment variable was set.

### Input versus installed data

The pinned Wiktextract gzip contained 11,121,531 lines. An independent stream read counted 9,622,370 non-English rows and 1,499,161 English rows containing 1,795,048 source sense objects. The source scan found 1,793,713 senses with normal glosses and another 140 with only a raw gloss field. The original database contained 1,793,712 searchable Wiktionary senses. This difference came from the old raw-gloss omission, one record rejected during headword validation, and source sense objects without a gloss. The public vocabulary gap was much larger because neither the API nor the data release was present at the public origin.


## After the full rebuild

The local SQLite installation has **1,421,262 distinct normalized headword keys** with at least one sense, up from 1,403,043. It contains **2,166,533 individual senses**, up from 2,138,869. The full-text index contains 2,166,533 rows. The union counts a spelling once even when several sources define it. The largest indexed headword key is 115 characters.

| Source | Source records | Headword keys | Lexemes | POS records | Senses | Inflection mappings | Etymologies | Pronunciation records | Examples | Synonym edges | Antonym edges | Synsets | Historical entries |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| English Wiktionary | 1,499,161 | 1,360,465 | 1,497,961 | 1,497,961 | 1,793,846 | 732,435 | 537,584 | 436,955 | 98,011 | 727,467 | 54,266 | 0 | 0 |
| Open English WordNet 2025+ | 282,439 | 152,459 | 161,875 | 161,875 | 212,659 | 4,448 | 0 | 0 | 104,370 | 328,082 | 7,990 | 120,564 | 0 |
| Webster 1913 | 116,248 | 99,956 | 115,107 | 110,686 | 160,028 | 0 | 53,379 | 0 | 0 | 0 | 0 | 0 | 115,107 |

### Import reconciliation

- Wiktionary archived all 1,499,161 English rows from the verified raw dump. The parser recovered 140 senses from source raw glosses. It excluded 1,195 sense objects with neither kind of gloss, six duplicate sense objects in six byte-identical source records, and one sense on a record without a usable headword. These records remain in the source archive. This accounts for all 1,795,048 input sense objects and produces a net increase of 134 indexed senses.
- The [2025+ WordNet release](https://en-word.net/downloads) yielded all 161,875 lexical entries, 212,659 lexical senses, and 120,564 synsets found by the independent XML scan. Raw synsets retain their source relationship records.
- Webster's pinned ebook yielded 112,133 recognized entry blocks. Some blocks supply several headword spellings, so archive and lexeme counts can differ from the block count. All 1,141 recognized blocks without a usable marked definition are retained as raw source records. They have no searchable gloss. The imported historical meanings remain separate from contemporary senses.
- The full run resumed after 822,000 archived Wiktionary rows. Its final validation reconciled source counts, normalized lexeme and sense counts, and SQLite full-text index rows before activating each source.

### Actual retrieval

The exact-lookup eligibility query found all 1,421,262 keys retrievable. The running HTTP API returned exact search results and the identical set of sense IDs as the database for all 103 probes. That included all 23 requested examples and 80 seeded reservoir samples taken over the entire key set. Two successive prefix pages matched the database and contained disjoint keys. The static app uses the published index shards when a full API is unavailable.

| Requested headword | Senses before | Senses after |
| --- | ---: | ---: |
| sesquipedalian | 8 | 8 |
| defenestration | 5 | 5 |
| syzygy | 11 | 11 |
| anfractuous | 4 | 4 |
| susurration | 4 | 4 |
| absquatulate | 3 | 3 |
| chthonic | 3 | 3 |
| quincunx | 7 | 7 |
| ultracrepidarian | 2 | 2 |
| floccinaucinihilipilification | 1 | 1 |
| pneumonoultramicroscopicsilicovolcanoconiosis | 1 | 1 |
| run | 215 | 215 |
| set | 188 | 189 |
| bank | 84 | 84 |
| light | 165 | 165 |
| spring | 105 | 105 |
| charge | 118 | 118 |
| cleave | 20 | 20 |
| sanction | 16 | 16 |
| lead | 121 | 121 |
| lie | 47 | 48 |
| fine | 68 | 68 |
| bear | 106 | 106 |


## Offline packs and static search

Release `english-2026-11-18-r2` was generated from the audited database. All edition chunks and online form shards passed independent SHA-256, byte-length, row-count, and key-range verification.

| Edition | Headword keys | Lexemes | Senses | Compressed bytes | Decoded bytes before indexing |
| --- | ---: | ---: | ---: | ---: | ---: |
| Essential English | 233 | 1,414 | 8,824 | 786,383 | 3,427,852 |
| Complete English | 1,421,262 | 1,774,943 | 2,166,533 | 284,835,801 | 1,507,305,084 |
| Scholarly Research | 1,421,262 | 1,774,943 | 2,166,533 | 375,123,504 | 2,231,565,612 |

- **Essential English** includes definitions, headwords, inflections and forms, parts of speech, pronunciations, source attribution, synonyms.
- **Complete English** includes antonyms, definitions, etymologies, headwords, historical entries, inflections and forms, parts of speech, pronunciations, source attribution, synonyms, usage examples.
- **Scholarly Research** includes antonyms, definitions, etymologies, headwords, historical entries, inflections and forms, parts of speech, pronunciations, source attribution, source evidence, synonyms, usage examples.

- English Wiktionary 2026-10-01 / Wiktextract 19f9a30 carries CC BY-SA 4.0. [English Wiktionary terms](https://foundation.wikimedia.org/wiki/Policy:Terms_of_Use)
- Open English WordNet 2025+ carries CC BY 4.0 and Princeton WordNet License. [Open English WordNet terms](https://github.com/globalwordnet/english-wordnet/blob/2025-edition/LICENSE.md)
- Webster's Revised Unabridged Dictionary (1913) Gutenberg 29765 / 2025-07-06 carries Public domain in the United States. [Webster's Revised Unabridged Dictionary (1913) terms](https://www.gutenberg.org/ebooks/29765)

The decoded byte count measures the data before storage indexes. Chromium installed the full Complete pack in 251.2 seconds over loopback. Its storage estimate increased by 1,008,893,689 bytes, including indexes. With networking disabled and the HTTP cache cleared, the app reloaded, displayed etymology and local audio for *bank*, followed the spelling variant from *colour* to *color*, and opened *pneumonoultramicroscopicsilicovolcanoconiosis*. A corrupted Essential replacement was rejected and the installed Complete edition remained active. Essential and Scholarly were validated as generated artifacts. Their browser-installed sizes were unmeasured.

The static lookup index contains 1,079,578 distinct published inflection and variant rows whose targets have entries. With only a static server, Chromium successfully looked up *syzygy* before pack installation and browsed two successive prefix pages. The coverage command reported all 1,421,262 keys eligible for lookup and zero warnings.

The generated artifacts are local under `apps/open-dict/data/releases/` and excluded from Git. The public Pages origin still needs the updated app and those artifacts published together. The production check in this audit saw the bundled coverage described above.
