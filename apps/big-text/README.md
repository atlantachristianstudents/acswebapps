# Big Text

Type a number (or a line of text) and it is drawn full-screen, scaled to fit the window. Built for projecting hymn numbers: with the `l`/`c`/`k`/`s`/`b`/`e` keys it can show the same number in other languages' hymnals below the big one (English hymns 1-1348). No network needed once installed.

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
| `l` | All other languages for the number |
| `c` `k` `s` `b` | Chinese / Korean / Spanish / Burmese number (or `-` if that hymnal has no match) |
| `e` | Label the main number English + Korean, show Chinese, Spanish, Burmese below |
| `Ctrl+Delete` | Clear |
| `Ctrl+C` | Copy the current value |
| `?` / `/` | This shortcut list (in text mode, `Ctrl+/`) |
| `Ctrl+\` | Switch number / text mode |

Touch screens get the on-screen buttons automatically; they are the same actions.

## Notes
- The other-language table is embedded in the page (`XREF`, 1348 rows); it is the site's own cross-reference of English hymn numbers.
- The display font (Big Shoulders Display) and utility font (IBM Plex Mono) come from Google Fonts; they are cached for offline after the first load, and the app falls back to system fonts if offline before that.
