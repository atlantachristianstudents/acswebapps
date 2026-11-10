# Enjoyer hymn-number comparison

Compared on 2026-11-10 against https://songs.enjoyer.life/. The CSVs below record the original comparison. The app now includes Enjoyer links alongside the original mappings in All Languages mode and uses Enjoyer Burmese numbers in E/K mode.

Read all 1,491 English Hymns records and tune variants covering English numbers 1–1348. The comparison uses canonical `H<number>` records, combining links from duplicate canonical records. There are 1,347 distinct canonical English numbers; H172 is absent from the catalog. Alternate tune records are not treated as extra translations. Only explicit `related_songs` links are compared; titles and shared tunes are not used to infer translations.

## Results

Each count is one English hymn in the named language. “Agrees” includes exact agreement and overlap where Enjoyer lists additional alternatives. “Different” means both sources provide numbers with no number in common; it can reflect different editions or alternate books, so it is not automatically an error. A missing link is not evidence that a current number is wrong.

| Language | Agrees | Different | Source adds mapping | Current mapping without source link |
| --- | ---: | ---: | ---: | ---: |
| Cebuano | 611 | 0 | 2 | 0 |
| Tagalog | 766 | 0 | 1 | 24 |
| French | 230 | 6 | 28 | 0 |
| Sinhala | 141 | 4 | 5 | 33 |
| Slovak | 236 | 0 | 3 | 74 |
| Urdu | 1 | 0 | 0 | 429 |
| Chinese | 896 | 1 | 3 | 9 |
| Portuguese | 252 | 1094 | 0 | 1 |
| Spanish 2nd | 461 | 5 | 1 | 419 |
| Burmese | 0 | 88 | 602 | 11 |
| Korean | 0 | 0 | 724 | 0 |

## Interpretation

- Chinese: `C` and `Z` are traditional/simplified main hymnbooks; `CS` and `ZS` are supplementary and are normalized to the app’s `s` prefix. New-song `CN`/`ZN` links are retained in the raw links CSV but excluded from this main/supplementary comparison. H893 differs: app `s917`, Enjoyer `C641`/`Z641`.
- Spanish: `ES` is compared against the current second-edition column where there is a link. The site calls it “Himnos”; the exact edition has not been independently confirmed. `SC` is “Suplemento de Canticos”, not a demonstrated first-edition equivalent. Spanish 1st therefore remains unresolved.
- French and Korean can include 3000-series alternative numbers under the same section prefix. These are preserved rather than silently removed.
- Portuguese: `PT` is the site’s Portuguese (Portugal) hymnal. The 1,094 differences may reflect numbering/edition differences from the existing Portuguese table; they should not be applied blindly.
- Burmese: `M` is the main book and `MS` is supplementary (normalized with `s`). All 88 existing mappings that have source links disagree. The earlier myanmarhymn.com table belongs to a different numbering system and should not be merged with this book.
- Korean is an existing shortcut with no embedded number column. The report compares it as currently empty.
- Sinhala, Slovak and Urdu include legacy explicit references (`si/`, `sk/`, `ur/`); these are interpreted only by their named language codes. Coverage is incomplete.
- The existing `HD` column has no confirmed section identity and is not compared to Dutch or Haka Chin by guesswork.

## Playlist cross-check

Of the playlist’s 30 unique explicit number pairs: 27 agree with Enjoyer, 1 differs, 1 has no Enjoyer Burmese link, and 1 is outside the app’s English range.

- English 857 → Myanmar 440 is confirmed by Enjoyer.
- English 801 → Myanmar 421 agrees; the playlist’s other video says Myanmar 423, while Enjoyer links only M421.
- English 1090 → Myanmar 648 appears in the playlist but has no corresponding Burmese link in Enjoyer.
- English 1349 → Myanmar 1 is outside the app’s 1–1348 range and is not checked by this comparison.

## Files

- `enjoyer_language_comparison.csv`: all 1,348 English numbers × 13 existing language views/columns, including Korean; current values, normalized source values, raw codes, status, and source URLs.
- `enjoyer_language_links.csv`: raw explicit cross-language link metadata from the canonical English records, including sections excluded from comparison.
- `burmese_playlist_comparison.csv`: previously captured playlist titles and explicit number pairs.

Supplementary/main edition distinctions and source gaps are retained for review. The app retains the original `XREF` table and adds an offline `ENJOYER_REFS` snapshot. All Languages merges the two with separate source entries for additional numbers; E/K uses Enjoyer Burmese mappings.
