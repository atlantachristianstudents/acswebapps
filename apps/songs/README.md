# Songbook

Song library, set lists and lyrics presentation, powered by the Songbase database. The full catalog is downloaded once into the browser (IndexedDB) and re-used from there, so after the first sync the app works offline (the app shell itself is cached by the service worker).

## Install (needs the files served over HTTPS once, so the browser can cache them)
- Host this folder on any static host (GitHub Pages, Netlify, Cloudflare Pages), open the URL, then:
  - Android / Chrome / Edge desktop: browser menu > Install app
  - iPhone / iPad: Safari > Share > Add to Home Screen
- After the first load the app opens without a connection; song data lives in IndexedDB and the pages in the cache.

## Local use
Run `python3 -m http.server 8000` in this folder and open http://localhost:8000 (localhost counts as secure, so install and offline work there too).

If the CORS proxy is unreachable, syncing falls back to `songbase.life` directly, and vice versa. Tap ↻ in the top bar to sync manually.

## Features
- Songbooks: create any number of collections, rename, reorder songs by drag (mouse) or the ⠿ handle (touch).
- Library: search Songbase by title, lyrics words or numeric ID, add songs to a book in one tap.
- My songs: search inside the active songbook.
- Present: full-screen lyrics, one verse per slide, with A− / A+ / Fill text sizing (Fill finds the largest size that fits; your choice is remembered), swipe on touch, and keyboard navigation (arrows, Space, Page Down, Home/End, Escape).
- Export / import: download the active songbook as a JSON file with the lyrics embedded, and load it back onto another device — no sync needed.

## Data location
Everything is stored on the device: books and settings in localStorage, songs in IndexedDB. Nothing is uploaded anywhere.

When you replace index.html with a newer version, change VERSION in sw.js so devices pick it up.
