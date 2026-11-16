# Bible Compare

Read Scripture and compare verses side by side across Bible translations, with the Recovery Version (RcV) always shown first. Self-contained: everything lives in this folder.

## Features

- One search box does everything: type a reference (`John 3:16`), a book name (`John` — pick a chapter from the list), or words (`light`) and results appear live below it. Clicking a result opens the passage.
- Word search defaults to the Recovery Version only; a "Search in" selector at the top of the results widens it to every downloaded translation.
- ‹ › buttons move between chapters; arrow keys work too.
- RcV is always the first translation; add more translations to compare verses side by side, aligned by verse reference (verses missing from one translation show "—").
- On desktop the translations appear side by side; on narrow screens they stack with a translation tag on each verse.
- **Highlight differences** (toggle in the reading view): words in each translation that differ from the Recovery Version's words in that verse get a soft highlight.
- **Translations manager** ("+ Translations"): lists every translation with its license and whether it is downloaded, available for download, or currently downloading. While the app is open and online, translations download automatically one at a time (after the Recovery Version) so they work offline later.
- **Reading position**: the app reopens at the last book, chapter, and scroll position.
- **Themes**: the same presets as Rise (Navy, Dawn, Paper, Sage, Ocean, Rose, Dusk, Midnight), chosen from the Theme button; Dusk and Midnight follow the system dark setting automatically.
- Word/phrase search is built into the same search box: live, debounced results with highlighted matches, every search word must appear, plus a direct "Go to …" shortcut when the query is a reference.
- Text size is set with a number input (13–26 px); passage, scroll position, translations, and theme are remembered locally in `localStorage`.

## Data sources and licensing

- **Recovery Version (RcV)** — always included, primary translation. Downloaded from the shared ACS Scripture source (`https://cdn.rapidfile.cc/FHh3yuZT6Fzl/RcV`, ~31,103 verse lines). For non-commercial reading by ACS Web Apps.
- **Other translations** — downloaded on demand from [thiagobodruk/bible](https://github.com/thiagobodruk/bible) JSON files. That repository's MIT license covers only the file structure; each Bible text keeps its own rights. Only **public-domain** English texts are offered:
  - King James Version (1611) — public domain
  - American Standard Version (1901) — public domain
  - World English Bible — public domain
  - Young's Literal Translation (1898) — public domain
  - Darby's Translation (1890) — public domain
  - Bible in Basic English — public domain
  - Douay-Rheims Bible (1899) — public domain

  Modern copyrighted translations (NIV, ESV, NASB, NKJV, NLT, CSB, etc.) are **not** bundled or offered because they cannot be freely redistributed.

## Offline behavior

- The app shell (`index.html`, manifest, service worker) is cached by `sw.js` (`bible-compare-v1`).
- The Recovery Version text downloads once and is stored in the `bible-compare-database` IndexedDB database (with a localStorage backup and a 15-day refresh TTL). Downloads survive app updates; the service-worker cache version is independent.
- Each additional translation downloads once on first use and is stored in the same IndexedDB database. Downloaded translations work offline; ones not yet downloaded show a clear "connect to the internet" message instead of wrong content.
- Bible text files are never added to the service-worker cache.

## Files

- `index.html` — the whole app (markup, styles, script)
- `manifest.webmanifest` — PWA manifest
- `sw.js` — offline cache; bump `VERSION` when `index.html` changes (keep the updater's `data-version` in sync)
- `icons/icon.svg` — app icon

## Usage counts

Maintainers can view totals at https://atlantachristianstudents.goatcounter.com (Events view: `apps/bible-compare/open`, `apps/bible-compare/installed-open`, `apps/bible-compare/install`). The self-contained `acswebapps-usage` script in `index.html` must stay in sync with the other apps.
