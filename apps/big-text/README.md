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
| `u` / `Ctrl/Cmd+Z` | Undo the last clear (the swap-back trick keeps the previous value, so a second press switches back) |
| `-` / `+` | Smaller / bigger (with other languages showing, resizes them the opposite way) |
| `f` | Fill the window again |
| `Shift+F` | Full screen |
| `w` / `Alt+W` | Toggle line wrapping |
| `h` | Cycle theme (system, black on white, white on black) — remembered |
| `m` | Show / hide the on-screen buttons (remembered) |
| `t` | Text mode (any characters); `Esc` or `Ctrl/Cmd+\` back to numbers |
| `Cmd/Ctrl+Enter` | Open hymn search from any mode; search titles and lyrics, use arrows to browse, Enter or click to select, Esc to cancel |
| `Space` | When number mode is empty, open hymn search. Otherwise, present the current hymn from stanza 1; Space exits to the unchanged number; `1`–`9` jumps to a stanza, `c` / `Shift+C` cycles choruses forward / backward, `s` / `Shift+S` cycles stanzas forward / backward from the current slide |
| `l` | All other languages for the number; always includes Chinese and both Spanish editions (`-` for missing matches) |
| `c` `k` `s` `b` | Chinese / Korean / both Spanish editions / Burmese numbers (or `-` if that hymnal has no match) |
| `e` / `a` | Label the main number English + Korean; below, show Burmese and Chinese on the first row, Spanish 1st and Spanish 2nd on the second. The `e` view also shows Enjoyer Russian numbers on the same row as Spanish; `a` omits Russian (`-` if missing) |
| `E` (`Shift+e`) | Toggle alternate E/K view with Enjoyer Korean numbers on an additional row below; the main E/K number stays separate. Press `E` again to turn off; lowercase `e` switches to the regular view. Missing Korean links show `-`. |
| `Ctrl/Cmd+Delete` | Clear |
| `Ctrl/Cmd+C` | Copy the current value |
| `?` / `/` | This shortcut list (in text mode, `Ctrl/Cmd+/`) |
| `Ctrl/Cmd+\` | Switch number / text mode |

E/K number views start one `+` step larger by default, giving the main number more room above the language panel.

Touch screens get the on-screen buttons automatically; they are the same actions.

## Notes
- The other-language table is embedded in the page (`XREF`, 1348 rows); it is the site's own cross-reference of English hymn numbers.
- Chinese numbers come from `hymnal_crossrefs_all.csv`: 705 main-book matches and 202 supplementary-book matches. Supplementary numbers use an `s` prefix (for example, English hymn 70 shows Chinese `s307`); they appear under Chinese in every language view. Chinese numbers of 9000 or higher appear only in All Languages (`l`) mode; E/K (`e`) and Chinese (`c`) modes show `-` for those codes.
- Spanish numbers use both columns in `spanish hymns.pdf`, shown separately as **Spanish 2nd** (`S 2da`) and **Spanish 1st** (`S 1era`). The `s` shortcut and `e` view show both editions; the compact `e` labels are **S2** and **S1**. The second edition has 887 matches across 886 English hymns; the first edition has 481 matches. English hymn 912 lists both second-edition Spanish numbers 750 and 751, as in the source. Rows with unknown English numbers (`?`) are not mapped, and first-edition asterisks are treated as missing matches. Missing matches show `-` with the Spanish shortcut.
- Burmese numbers use `burmese.pdf` in every view (`b`, All Languages, and both E/K modes): 570 mappings for English hymns 1–1343. English 353 uses Burmese 208, correcting the PDF’s apparent 308 typo. PDF dashes, blank cells, and English 1344–1348 show no match (`-` in shortcut/E/K views). Enjoyer Burmese alternatives are excluded. `burmese_crossrefs.csv` preserves the earlier title-matched numbering for historical reference; it is no longer used by the app. See [burmese_pdf_comparison.md](burmese_pdf_comparison.md) for the comparison made before this update.
- The display font (Big Shoulders Display) and utility font (IBM Plex Mono) come from Google Fonts; they are cached for offline after the first load, and the app falls back to system fonts if offline before that.

## Cross-reference comparison

See [enjoyer_comparison.md](enjoyer_comparison.md) for the comparison of every existing language against Enjoyer’s explicit hymn links, including edition limitations and the Myanmar playlist cross-check. The comparison CSVs preserve the original snapshot. All Languages (`l`) also includes explicit linked numbers from Enjoyer for languages other than Burmese, including additional languages and supplementary/new-song sections. Equal numbers in the same language/book appear once; differing or additional numbers appear as separate `(Enjoyer)` entries alongside the originals. Simplified/traditional Chinese duplicates are combined, and Chinese supplementary numbers keep the `s` prefix. All views use the PDF’s Burmese numbers (for example, English 857 → Burmese 440); the E/K layout is retained. The Enjoyer snapshot is embedded in `ENJOYER_REFS` for offline use. H172 has no Enjoyer source record.

## Hymn presentation

Type a hymn number and press **Space**, or tap **Present**, to show its lyrics one stanza or chorus at a time. A left sidebar keeps the English hymn number and your selected language numbers visible, including the current `e` / `a`, alternate E/K, or All Languages view. Press **Tab** to show or hide the entire left sidebar; lyrics refit to the available width. Press **N** to show or hide only the hymn and language number list; this choice carries across hymns during the session. In `a` mode, number labels appear inline as compact characters (`E/K`, `B`, `C`, `S1`, `S2`) before their numbers, with large numbers matching the `E/K` label’s font size. Lyrics automatically fit the remaining space and follow the selected theme. Press **-** to decrease the presentation font size or **=** (also **+**) to increase it; the chosen scale carries across stanza changes and hymns during the session. Press **0** or **F** to reset the size and fit the lyrics to the available screen space. **Shift+F** toggles fullscreen in presentation mode. Presentation controls, the title, and the clickable slide list sit in the left sidebar alongside the hymn numbers, leaving the full content height for lyrics. Exit sits above the song name, stays visible while scrolling the sidebar, and wraps to fit narrow screens. The slide list wraps and scrolls vertically and lists every slide in order, including repeated choruses. Click or tap a stanza or chorus to go directly to it; the current slide is highlighted. Slide buttons use just the stanza number or `c` for a chorus; navigation buttons use arrows only. Hovering a slide button previews its lyrics. Press **?** or **/** during presentation for its shortcut page; any plain key closes help without changing the slide. Number and text modes have their own shortcut pages. Press **B** to toggle bold lyrics in either slide or full-song view; the choice carries across hymns during the session. Press **Enter** to show the entire song, with repeated identical choruses shown only at their first occurrence. Full-song view chooses up to four balanced columns when they allow larger text, keeping each stanza or chorus together; press **Enter** again to return to the previous slide. Selecting a stanza or chorus also returns to slide view. Press **1–9** to jump directly to a stanza. **C** cycles forward through choruses; **Shift+C** cycles backward. **S** cycles forward through stanzas from the current slide; **Shift+S** cycles backward. Both cycles wrap around. Previous / Next buttons and arrow keys also navigate slides. **Space** is the only keyboard shortcut that exits presentation; the **Exit** button also works by touch or click. Returning preserves the number and language selections. A single chorus is repeated after each stanza. Chord brackets and `#` metadata are hidden.

The embedded hymn library comes from the user-provided `songbase_english.json`, using the `english_hymnal` book’s **song ID → hymn number** mapping. It includes 1,347 hymn numbers (1–1348 except 745, whose song record is absent from the supplied file). Hymn 1193 has two versions, selectable in the presentation header. Missing hymns show a message instead of opening an empty presentation. The library is embedded in `index.html`, so it works offline and from `file://` without fetching the source JSON. The original JSON is retained as the import source.

### Hymn text search

In empty number mode, press **Space** to search the imported English hymn titles and lyrics. **Cmd+Enter** (Mac) / **Ctrl+Enter** opens search from number, text, presentation, or shortcut views. Search ignores chords, accents, apostrophes, case, and punctuation; multiple words can match anywhere in the title or lyrics. Exact hymn numbers and title matches rank first. Up to 40 results are shown; type more to narrow the list. Use arrows and Enter, or click a result, to display its hymn number. Selecting a result returns to number mode; **Space** then presents it. **Esc** or the close button cancels without changing the previous text, hymn, slide, or language selections. Search works offline.
