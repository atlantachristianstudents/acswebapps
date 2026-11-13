# Chronological Bible

Static, offline-capable Bible reader. Serve dist with any static web server; no build step or dependencies required. Includes timeline navigation, reference/text search, URL references, saved readings, reading position, and text/theme settings. Local storage is browser-specific.

Text comes from the RcV payload embedded in the local verse-lookup-embedded.html. Sequence comes from reese-chronological-verse-order.json, with era labels from the local Reese EPUB. All 31,102 supplied references matched; RcV Revelation 12:18 was inserted after 12:17. Study notes are not included. Chronological ordering follows Reese, with one local adjustment: Ezekiel 28:11–19 and Isaiah 14:12–17 ("Satan Cast Out of Heaven") appear immediately before Genesis 1:2, at the end of Eternity Past.

Run `python3 -m http.server 8080 --directory dist` from this directory for local use.

## Passage selection

Open Search to choose a book, chapter, and verse from tables, or type a reference or phrase. Click a cell, or Tab into the table and use the arrow keys to move between cells. Enter or Space selects the focused cell; selecting a verse opens it in the reader. Home/End move to the first/last cell in a row; Ctrl+Home/End move to the first/last cell in the table. Use the Books, book name, and chapter buttons above the table to revisit a selection. Escape closes Search. On phones, book tables use two readable columns and touch targets are at least 44px high. Search opens with the passage table focused on touch devices, keeping the keyboard closed until you tap the text field. The text field uses 16px type, and the dialog fits the available viewport; normal pinch zoom remains available.

## ACS Web Apps integration

Open the app at `https://acswebapps.com/apps/chronological-bible/`. The folder’s `index.html` forwards to `dist/`, preserving query parameters and verse fragments. The forwarding page does not emit usage events; the reader counts its own open.

The home-page registry links directly to `dist/`, the self-contained runnable app. No build is required. Open `dist/index.html` directly for local reading, or serve `dist/` over HTTP for installation and offline caching. On a supported browser, open the app online once, then use the browser’s Install/Add to Home Screen command. Wait for the initial cache download before going offline.

The deployed reader uses the standard ACS anonymous usage counts with the fixed `chronological-bible` identifier; Scripture, searches, bookmarks, and reading position are never sent. Local hosting and privacy opt-outs disable counts. The standalone HTML export is a separate local-use artifact and does not report usage.

When changing runnable files, update `dist/sw.js`’s cache version and keep its `FILES` list complete. Cache upgrades remove only this reader’s old caches and preserve saved readings in localStorage. `build-data.py` is an optional import helper tied to the original local source files, not a deployment step.

The About dialog links back to ACS Web Apps. Former `apps/rcv-chronological/` and `apps/rcv-chronological/dist/` URLs forward to this reader, preserving queries and verse fragments. The original `rcv-chronological` localStorage key is retained so saved readings and settings survive the rename on the same origin.
