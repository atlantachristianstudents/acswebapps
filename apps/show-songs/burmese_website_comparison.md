# Burmese website comparison

Compared Big Text's active PDF-based `XREF` Burmese column with the [Myanmar Hymns website](https://myanmar-hymn-pwa.vercel.app/#settings) on 2026-11-11. No app mappings were changed.

The website's [SQLite database](https://myanmar-hymn-pwa.vercel.app/data/hymn-house.sqlite) contains 735 Myanmar hymns. This comparison reverses each Myanmar hymn's explicit `cross_references.Eng` into English → Myanmar numbers; it excludes the separate young people's/new-song collection. The reference `460(2)` is treated as English hymn 460, with its second-tune annotation retained here for clarity. The database catalog version begins `18-english-1352` and ends `m556-c16d786b91f2`.

## Results

| Result across English 1–1348 | Count |
| --- | ---: |
| Exactly the same Burmese numbers | 567 |
| Big Text number included among website alternatives | 2 |
| Conflicting numbers with no overlap | 0 |
| Big Text mapping only | 1 |
| Website mapping only | 163 |
| Neither has a mapping | 615 |

569 of Big Text's 570 mappings agree with the website, counting alternatives. The website has broader coverage; missing references do not prove that a mapping is incorrect.

| English | Big Text | Website |
| --- | --- | --- |
| 170 | 94 | 94 / 581 |
| 881 | 470 | 470 / 629 |
| 1160 | 569 | No explicit Myanmar hymn reference |

The website confirms the app's corrected English 353 → Burmese 208. It also agrees on English 857 → Burmese 440 and English 1199 → Burmese 571. English 990 maps to 520 only in this website snapshot.

Examples of additional website mappings: English 58 → Burmese 58, 76 → 576, 78 → 577, 133 → 578, and 146 → 146. Beyond Big Text's current English range, the website also links English 1351 → Burmese 700.

Every number, including blanks and all 163 additions, is recorded in [burmese_website_comparison.csv](burmese_website_comparison.csv). These results compare explicit references, not translated lyrics or melody identity.
