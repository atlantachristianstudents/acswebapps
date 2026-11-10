# Big Text

Type a number (or a line of text) and it is drawn full-screen, scaled to fit the window. The display has no heading bar. Built for projecting hymn numbers: with the `l`/`c`/`k`/`s`/`b`/`e` keys it can show the same number in other languages' hymnals below the big one (English hymns 1-1348). No network needed once installed.

## Install (needs the files served over HTTPS once, so the browser can cache them)
- Host this folder on any static host (GitHub Pages, Netlify, Cloudflare Pages), open the URL, then:
  - Android / Chrome / Edge desktop: browser menu > Install app
  - iPhone / iPad: Safari > Share > Add to Home Screen
  - Mac Safari: File > Add to Dock
- After the first load, Big Text runs fully offline.

## Local use
Run `python3 -m http.server 8000` in this folder and open http://localhost:8000. Or just open index.html directly; it is fully self-contained.

## Shortcuts
Press `?` (or `/`) in number mode to see the list in-app.

| Key | Action |
| --- | --- |
| `0-9` | Type the number (number mode) |
| `←` / `→` | Hymn number -1 / +1 |
| `↑` / `↓` | Hymn number -37 / +37 |
| `Backspace` | Delete (number mode) / clear (text mode via Enter) |
| `Enter` | Clear (number mode) / new line (text mode) |
| `u` / `Ctrl+Z` | Undo the last clear (the swap-back trick keeps the previous value, so a second press switches back) |
| `-` / `+` | Smaller / bigger (with other languages showing, resizes them the opposite way) |
| `f` | Fill the window again |
| `Shift+F` | Full screen |
| `w` / `Alt+W` | Toggle line wrapping |
| `h` | Cycle theme (system, black on white, white on black) — remembered |
| `m` | Show / hide the on-screen buttons (remembered) |
| `t` | Text mode (any characters); `Esc` or `Ctrl+\` back to numbers |
| `l` | All other languages for the number; always includes Chinese and both Spanish editions (`-` for missing matches) |
| `c` `k` `s` `b` | Chinese / Korean / both Spanish editions / Burmese numbers (or `-` if that hymnal has no match) |
| `e` / `a` | Label the main number English + Korean; below, show Burmese and Chinese on the first row, Spanish 1st and Spanish 2nd on the second, and Enjoyer Russian numbers on a third row (`-` if missing) |
| `E` (`Shift+e`) | Toggle alternate E/K view with Enjoyer Korean numbers on an additional row below; the main E/K number stays separate. Press `E` again to turn off; lowercase `e` switches to the regular view. Missing Korean links show `-`. |
| `Ctrl+Delete` | Clear |
| `Ctrl+C` | Copy the current value |
| `?` / `/` | This shortcut list (in text mode, `Ctrl+/`) |
| `Ctrl+\` | Switch number / text mode |

Touch screens get the on-screen buttons automatically; they are the same actions.

## Notes
- The other-language table is embedded in the page (`XREF`, 1348 rows); it is the site's own cross-reference of English hymn numbers.
- Chinese numbers come from `hymnal_crossrefs_all.csv`: 705 main-book matches and 202 supplementary-book matches. Supplementary numbers use an `s` prefix (for example, English hymn 70 shows Chinese `s307`); they appear under Chinese in every language view. Chinese numbers of 9000 or higher appear only in All Languages (`l`) mode; E/K (`e`) and Chinese (`c`) modes show `-` for those codes.
- Spanish numbers use both columns in `spanish hymns.pdf`, shown separately as **Spanish 2nd** (`S 2da`) and **Spanish 1st** (`S 1era`). The `s` shortcut and `e` view show both editions; the compact `e` labels are **S2** and **S1**. The second edition has 887 matches across 886 English hymns; the first edition has 481 matches. English hymn 912 lists both second-edition Spanish numbers 750 and 751, as in the source. Rows with unknown English numbers (`?`) are not mapped, and first-edition asterisks are treated as missing matches. Missing matches show `-` with the Spanish shortcut.
- Burmese numbers are matched by English title from [Myanmar Hymn Lyrics](https://www.myanmarhymn.com/index.php). Reviewed 420 listings: 99 listings map to 99 English hymns. `burmese_crossrefs.csv` records source titles, matches, and unmatched listings. Matching ignores punctuation/case and includes reviewed title variants and shortened titles; ambiguous or missing titles remain unmatched. Multiple Myanmar numbers for the same English hymn are separated by `/`. These original numbers remain in All Languages and the `b` shortcut. E/K mode uses Enjoyer’s Burmese hymnbook numbers instead, showing `-` when Enjoyer has no link.
- The display font (Big Shoulders Display) and utility font (IBM Plex Mono) come from Google Fonts; they are cached for offline after the first load, and the app falls back to system fonts if offline before that.

## Cross-reference comparison

See [enjoyer_comparison.md](enjoyer_comparison.md) for the comparison of every existing language against Enjoyer’s explicit hymn links, including edition limitations and the Myanmar playlist cross-check. The comparison CSVs preserve the original snapshot. All Languages (`l`) also includes every explicit linked number from Enjoyer, including additional languages and supplementary/new-song sections. Equal numbers in the same language/book appear once; differing or additional numbers appear as separate `(Enjoyer)` entries alongside the originals. Simplified/traditional Chinese duplicates are combined, and Chinese supplementary numbers keep the `s` prefix. E/K (`e`) mode uses Enjoyer’s Burmese numbers (for example, English 857 → Burmese 440); its two-row layout is retained. The Enjoyer snapshot is embedded in `ENJOYER_REFS` for offline use. H172 has no Enjoyer source record.
