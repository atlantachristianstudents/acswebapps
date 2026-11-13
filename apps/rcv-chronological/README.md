# Chronological · Recovery Version

Static, offline-capable Bible reader. Serve this folder with any static web server; no build step or dependencies required. Includes timeline navigation, reference/text search, URL references, saved readings, reading position, and text/theme settings. Local storage is browser-specific.

The app ships only the chronological ordering (`order.js`); the Recovery Version text is downloaded at runtime from the shared RcV text file (`https://cdn.rapidfile.cc/VbLdPuh9Yxb4/RcV`, documented in AGENTS.md) and cached in IndexedDB with a 15-day refresh window, matching the other RcV consumers. The first run needs internet; afterwards the reader works offline from the cache. A stale cache is used if a refresh fails. The text is validated against 31,103 verses before it is cached. Sequence comes from reese-chronological-verse-order.json, with era labels from the local Reese EPUB. All 31,102 supplied references matched; RcV Revelation 12:18 was inserted after 12:17. Study notes are not included. Chronological ordering follows Reese, with one local adjustment: Ezekiel 28:11–19 and Isaiah 14:12–17 ("Satan Cast Out of Heaven") appear immediately before Genesis 1:2, at the end of Eternity Past.

Run `python3 -m http.server 8080 --directory .` from this directory for local use.

## ACS Web Apps integration

The home-page registry links directly to this folder, the self-contained runnable app. No build is required. Open `index.html` directly for local reading, or serve this folder over HTTP for installation and offline caching. On a supported browser, open the app online once, then use the browser’s Install/Add to Home Screen command. Wait for the initial cache download before going offline.

The deployed reader uses the standard ACS anonymous usage counts with the fixed `rcv-chronological` identifier; Scripture, searches, bookmarks, and reading position are never sent. Local hosting and privacy opt-outs disable counts. The standalone HTML export is a separate local-use artifact and does not report usage.

When changing runnable files, update `sw.js`’s cache version and keep its `FILES` list complete. Cache upgrades remove only this reader’s old caches, preserve saved readings in localStorage, and keep the downloaded Scripture text in IndexedDB. `build-data.py` is an optional import helper that regenerates `order.js` from the shared RcV text file and the local Reese source files; it is not a deployment step.
