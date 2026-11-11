# Mapping data and sources

`mappings.json` is the editable source for the app's number mappings:

- `XREF_LABELS` names the columns in `XREF`.
- `XREF` contains comma-separated cross-reference rows indexed by English hymn number (1–1348); empty cells mean no match.
- `ENJOYER_REFS` retains the explicit Enjoyer links, including language/book distinctions. Index zero is unused in both tables.

After editing, run `python3 sync-mappings.py` from the app folder. It embeds changed tables in `index.html` and bumps the service-worker version. Run `python3 sync-mappings.py --check` to verify parity. The app reads the embedded tables, so opening index.html directly and offline use do not require a JSON fetch. This JSON is an editing source and is intentionally not precached.

## Provenance and decisions

The original multilingual table supplied Cebuano, Tagalog, French, Sinhala, Slovak, Urdu, Chinese, Portuguese, and the unidentified `HD` column. Do not infer an identity for HD. Chinese includes 705 main-book and 202 supplementary-book matches; supplementary numbers retain the `s` prefix. Codes at least 9000 appear only in All Languages mode.

`../sources/spanish hymns.pdf` supplies separate second- and first-edition columns. The second edition has 887 matches across 886 English hymns, and the first has 481. English 912 retains both second-edition numbers 750 and 751. Unknown English numbers and first-edition asterisks are unmapped.

Burmese combines `../sources/burmese.pdf` with explicit English references from [Myanmar Hymns](https://myanmar-hymn-pwa.vercel.app/), checked 2026-11-11 using its `data/hymn-house.sqlite` database. Only the main Myanmar hymnal is used, excluding the young people's/new-song collection. Website reference `460(2)` denotes English 460 with a second-tune annotation. Across English 1–1348, 567 PDF-based mappings matched exactly, two were included among website alternatives, one was PDF-only, and 163 were website-only. The merged table maps 733 English hymns. English 170 retains 94 / 581; 881 retains 470 / 629; PDF-only 1160 → 569 remains. English 353 → 208 corrects the PDF's apparent 308 typo, corroborated by the website; 857 → 440 and 1199 → 571 are also confirmed. The PDF covers English 1–1343; its six blank cells are not invented mappings. The old title-matched myanmarhymn.com table used a different numbering system and is superseded.

Enjoyer links were captured from [songs.enjoyer.life](https://songs.enjoyer.life/) on 2026-11-10 using explicit related-song links from canonical English `H<number>` records, combining duplicate canonical records, excluding alternate tunes as extra translations. H172 is absent. Traditional/simplified Chinese duplicates are combined; supplementary Chinese uses `s`. New-song and supplementary sections retain their separate identities. Portuguese PT is the Portugal hymnal and differs extensively from the original table; do not overwrite one with the other. Enjoyer Spanish ES is not independently confirmed as the same edition as Spanish 2nd; SC is a supplement, not an established first-edition equivalent. Enjoyer Burmese data remains in the snapshot but is excluded from display in favor of the combined PDF/website mapping. All Languages preserves other differing Enjoyer entries alongside the original values. Missing links do not establish that existing mappings are wrong.

The earlier playlist check confirmed 27 of 30 explicit pairs against Enjoyer, with one disagreement, one missing link, and one number outside the app range. English 801 → Myanmar 421 agreed, while another playlist video used 423; English 1090 → Myanmar 648 had no Enjoyer link; English 1349 was outside the app range. These were comparison observations, not replacement rules.

Historical comparison CSVs/reports, the superseded Burmese title-match export, and the imported English-only Songbase download were removed during consolidation. The active mapping values were preserved exactly. Source PDFs remain for review; they are not required at runtime.

## Lyrics libraries

`../songbase_all.json` remains the complete same-origin refresh snapshot used by the app and scheduled workflow. `songbasescraper.py --embed` maintains its offline embedded copy. The `hymn-data` and `burmese-data` JSON script blocks in index.html retain imported lyrics/fallbacks; they are separate from these number mappings and have not been removed. Downloaded libraries remain in the independent IndexedDB database.
