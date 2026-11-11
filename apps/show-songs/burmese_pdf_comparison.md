# Burmese PDF comparison

**Comparison before the update:** The app now uses the PDF’s 570 mappings in every view, correcting English 353 to Burmese 208. PDF dashes/blank cells and English numbers beyond 1343 have no mapping. Enjoyer Burmese alternatives are excluded from display. The report and CSV below preserve the comparison against the previous app data.

Compared `burmese.pdf` with the embedded tables in `index.html` on 2026-11-10. No app mappings were changed. The comparison is entirely local; Enjoyer refers to the app's embedded snapshot, not a fresh website lookup.

The PDF covers English 1–1343 and supplies 570 English-to-Burmese mappings. English 1344–1348 are outside its coverage. PDF page numbers below count the blank first page.

## Current E/K mode (Enjoyer Burmese)

| Result | English hymns |
| --- | ---: |
| Exact match | 557 |
| PDF number included among current alternatives | 3 |
| Different number | 1 |
| PDF mapping missing from current E/K mode | 9 |
| Current mapping where PDF has a dash | 129 |
| Both have no mapping | 638 |
| PDF cell blank (unresolved) | 6 |
| Total compared | 1343 |

560 of the PDF's 570 mappings agree with the current E/K mapping, counting overlap with alternatives.

### Different number

| English | PDF Burmese | Current E/K Burmese | PDF page |
| --- | --- | --- | --- |
| 353 | 308 | 208 | 9 |

The PDF explicitly prints 308. This looks like a possible PDF typo: the surrounding sequence is 349→206, 350→207, 357→209, and the PDF also assigns 533→308 (page 14). This is an inference, not a confirmed correction.

### PDF mappings missing from E/K mode

| English | PDF Burmese | PDF page |
| --- | --- | --- |
| 53 | 53 | 2 |
| 54 | 54 | 2 |
| 175 | 96 | 4 |
| 228 | 120 | 5 |
| 317 | 186 | 8 |
| 330 | 191 | 8 |
| 460 | 263 | 12 |
| 881 | 470 | 21 |
| 1160 | 569 | 27 |

### Current alternatives

| English | PDF Burmese | Current E/K Burmese |
| --- | --- | --- |
| 170 | 94 | 94 / 581 |
| 990 | 520 | 520 / 648 |
| 1199 | 571 | 365b / 571 |

The 129 current mappings whose PDF entries are dashes are listed individually in `burmese_pdf_comparison.csv`. A PDF dash does not establish that those current mappings are incorrect; the PDF has fewer mappings than the embedded Enjoyer snapshot.

## Original Burmese table (`b` shortcut)

The original title-matched myanmarhymn.com numbering has **zero matches** with the PDF: 88 English hymns have different numbers, 482 have PDF mappings only, and 11 have original mappings where the PDF has a dash. Another 756 have neither mapping and six PDF cells are blank. This supports the existing documentation that the original table uses a different numbering system. All Languages mode includes both the original table and Enjoyer entries.

## PDF ambiguities

- Page 6 prints English `346-250` with a dash. This was treated as the apparent intended range 246–250 only to account for coverage; the literal source cell is retained in the CSV.
- Burmese cells are blank for English 1001, 1002, 1004, 1005 (page 24), and 1337, 1338 (page 30). They are classified separately from explicit dashes. Current E/K mode also has no mapping for these six entries.
- Page 2's English 1–55 → Burmese 1–55 was expanded as corresponding individual numbers.

## Full comparison

`burmese_pdf_comparison.csv` contains all 1,343 English numbers in PDF coverage, the PDF's number and page, the original English range cell, both current Burmese values, and each comparison status. It preserves PDF values as printed, including 353→308. No cache version bump is needed because app files were not changed.
