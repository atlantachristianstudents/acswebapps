# Search

Search normalizes Unicode to NFKC, folds case, collapses whitespace, and harmonizes common apostrophes and hyphens. It retains the spelling displayed by the source. Ranking is exact headword, recognized inflection, recorded spelling variant, prefix, then bounded edit-distance suggestions. Adjacent transpositions count as one edit. Each result carries its match type.

The starter searches its small in-memory collection. Browser packs use compound IndexedDB keys for entry, form, prefix, and typo candidates. Browser filter searches use a bounded prefix candidate window. For narrowly specified filters on large packs, add a spelling prefix or use the online API. Definition matching in the browser uses normalized text. SQLite uses FTS5 word matching and PostgreSQL uses English-language full-text search with stemming.

The API uses parameterized SQL and indexed exact, form, and prefix lookup. PostgreSQL adds trigram candidate selection for misspellings. Results use each source’s recorded morphology, spellings, and labels. Corpus frequency ranking and a human-evaluated spelling benchmark are open work. Use the [benchmark command](TESTING.md) for measured results against your own database.
