# Adless

**Free, ad-free web apps by Atlanta Christian Students.** Everything runs in the browser — no accounts, no tracking, no ads. The site is a static app directory, and every app is a self-contained PWA that keeps working offline after the first visit.

[![Live Site](https://img.shields.io/badge/🌐_Live_Site-Visit-5865F2?style=for-the-badge)](https://atlantachristianstudents.github.io/adless/)
[![Discord](https://img.shields.io/badge/Discord-Join-5865F2?style=for-the-badge&logo=discord&logoColor=white)](https://discord.gg/77euBtgZjU)
[![Issues](https://img.shields.io/badge/GitHub-Issues-5865F2?style=for-the-badge&logo=github&logoColor=white)](https://github.com/atlantachristianstudents/adless/issues)

## Table of contents

- [Apps](#apps)
- [Features](#features)
- [Technologies](#technologies)
- [Install and offline use](#install-and-offline-use)
- [Requirements](#requirements)
- [Local development](#local-development)
- [Project structure](#project-structure)
- [Adding a new app](#adding-a-new-app)
- [Service-worker cache versions](#service-worker-cache-versions)
- [Deploying on GitHub Pages](#deploying-on-github-pages)
- [Troubleshooting](#troubleshooting)
- [Support](#support)
- [Contributing](#contributing)
- [License](#license)

## Apps

| App | What it does | Status |
| --- | --- | --- |
| [Bible Translation Explorer](https://atlantachristianstudents.github.io/adless/apps/bible-translation-explorer/) | Compare 11 Bible translations on literalness and readability, adjust the weighting, and export scores or charts — all offline. | beta |
| [Logos Type](https://atlantachristianstudents.github.io/adless/apps/logostype/) | Type Scripture verse by verse, track speed and accuracy, read what you have completed, and race friends. | live |
| [Memorize](https://atlantachristianstudents.github.io/adless/apps/memorize/) | Paste, import (text, PDF, or URL), or type a passage; recall it on a blank page; then review missing, changed, and extra words. Optional Test mode locks an attempt behind a passcode. | beta |
| [Big Text](https://atlantachristianstudents.github.io/adless/apps/big-text/) | Display hymn numbers or any text full-screen for projectors and livestreams, including hymn cross-references in Chinese, Korean, Spanish, and Burmese. | beta |
| [Tuner](https://atlantachristianstudents.github.io/adless/apps/tunes/) | Chromatic instrument tuner, metronome, tone generator, and chord/key detection using your device microphone. | live |
| [Verse Lookup](https://atlantachristianstudents.github.io/adless/apps/verses/) | Look up Bible verses and present them full-screen, with external-display support, outline import, and a downloadable Recovery Version. | live |
| [Songbook](https://atlantachristianstudents.github.io/adless/apps/songs/) | Browse the Songbase catalog, build and share songbooks, and present lyrics full-screen. Songs are cached for offline use after the first sync. | beta |

Statuses: **live** (stable), **beta** (usable, still changing), and **soon** (listed but not yet available).

## Features

- **No accounts, tracking, or ads.** Everything runs locally in your browser.
- **Installable and offline-first.** The home page and apps are PWAs with service workers. Once cached, core features work without a connection. Songbook needs an initial catalog sync; Logos Type races and Scripture downloads need the internet.
- **Your data stays on your device.** Progress, settings, and saved content live in `localStorage` or IndexedDB. URL imports fetch the source directly — your reference and answers are never uploaded.
- **Fast to browse.** Search the app directory (press `/` or `?`), filter by category, hide beta apps, and switch between light and dark themes. The choice is remembered.
- **Keyboard- and screen-reader-friendly.** Cards, filters, dialogs, and presentation controls are operable without a mouse.
- **Portable by design.** Every app folder can be copied out and hosted on its own static site. The home page is driven by a small registry, `assets/apps.js`.
- **No build step.** Edit a file, reload, and it is live. There is no bundler, transpiler, or npm install.

## Technologies

Plain HTML, CSS, and JavaScript, served as-is on GitHub Pages. There is no build system, no npm dependency, and no CI.

A few apps bundle or use specialized pieces:

- **Memorize** bundles PDF.js (with fonts and character maps) for private, offline PDF text import.
- **Logos Type** bundles PeerJS for friend races and downloads Scripture from a public API, caching it locally.
- **Songbook** syncs the Songbase catalog into IndexedDB.
- The **home page** loads the Inter font from Google Fonts; some apps use Google Fonts for their display type.

## Install and offline use

1. Open the [live site](https://atlantachristianstudents.github.io/adless/) in a modern browser.
2. Install the site or an individual app:
   - **Android / Chrome / Edge:** browser menu → **Install app**.
   - **iPhone / iPad (Safari):** Share → **Add to Home Screen**.
   - **Mac Safari:** File → **Add to Dock**.
3. Load an app once while online. After the service worker caches it, the app opens without a connection.

Each app has its own manifest and service worker, so apps can be installed independently and keep their own offline cache. The microphone-dependent Tuner app requires a secure context (HTTPS or `localhost`).

## Requirements

- Any modern browser to use the site.
- For local development: any static file server. Python 3, Node.js, or another simple server all work.
- HTTPS when deployed for service workers and microphone access. GitHub Pages provides HTTPS; `localhost` also counts as secure.

## Local development

Run a static server from the repository root so relative paths and service workers resolve correctly:

```sh
python3 -m http.server 8000
```

On Windows, if `python3` is not available:

```powershell
py -m http.server 8000
```

Then open <http://localhost:8000>. Reload after editing.

A service worker may keep serving cached files. If a change does not appear, bump the relevant cache version (see below) and hard-reload, or clear the site data. To open Logos Type directly, visit <http://localhost:8000/apps/logostype/>.

## Project structure

```text
index.html                 Home page (app directory)
404.html                   Not-found page
manifest.json              Home page web-app manifest (standalone PWA)
sw.js                      Home page service worker (skips apps/, which have their own)
.nojekyll                  Tells GitHub Pages to serve files as-is (no Jekyll processing)
AGENTS.md                  Conventions for AI coding agents working in this repo
assets/
  apps.js                  App registry — edit this to add or list apps
  main.js                  Theme toggle, tag filters, search, keyboard shortcuts, cards
  style.css                Site styles (light/dark)
  favicon.svg              Site icon
  icons/                   Home-page PWA icons (192, 512, maskable, apple-touch)
apps/
  _template/               Copy this folder to start a new app
  bible-translation-explorer/  Bible translation scores, weighting, and chart exports
  logostype/               Scripture typing, reading, records, and friend races
  memorize/                Memorization practice with word comparison and PDF import
  big-text/                Full-screen hymn numbers and text
  tunes/                   Tuner, metronome, tone generator, and chord detection
  verses/                  Verse presenter with external-display support
  songs/                   Songbook catalog, songbooks, and lyrics presentation
```

App folders contain `index.html`, `manifest.webmanifest`, `sw.js`, `icons/`, and a `README.md`. They are served directly; no build step is needed. Logos Type also keeps small redirects in `apps/logostype/dist/` for its former URLs and installed copies.

## Adding a new app

1. Copy `apps/_template/` to `apps/<app-id>/` (for example, `apps/tuner/`). The folder name is the app's `id`.
2. Build the app inside `apps/<app-id>/index.html`. Keep everything self-contained and use **relative paths only**, so the app works offline and on any static host. See `apps/_template/README.md` for the checklist.
3. Register the app in `assets/apps.js` by adding an entry and setting `status` to `"live"` or `"beta"`:

   ```js
   {
     id: "tuner",
     name: "Tuner",
     description: "Chromatic instrument tuner using your device microphone.",
     icon: "🎸",          // fallback emoji shown if no icon image exists
     tags: ["Worship", "Music"],
     status: "live"
   }
   ```

4. Commit and push. The card appears on the home page automatically.

Statuses are `live`, `beta`, and `soon` (`soon` renders a non-clickable "Coming soon" card). Cards use `apps/<id>/icons/icon-192.png` by default; set an optional `iconUrl` to point elsewhere. The optional `url` field overrides the default `apps/<id>/` destination. The registry fields are also documented in the header comment of `assets/apps.js`.

### Service-worker cache versions

The home page has its own `sw.js` (`VERSION` = `adless-home-vN`); bump it when you change `index.html`, `manifest.json`, or anything in the home `SHELL` list (including `assets/`). It deliberately ignores requests under `apps/`.

Every app's `sw.js` has a cache-version string, usually `VERSION` (for example, `"verse-lookup-v20"`). **Bump it whenever you change an app's HTML, manifest, or cached assets**, otherwise installed devices keep serving the old cached version. Update the cached-file list if the app gains new files. Logos Type uses `CACHE` and `ASSETS` in `apps/logostype/sw.js`; Tuner uses `CACHE` and `FILES`. Check each worker for its cache key and asset list.

## Deploying on GitHub Pages

1. Push these files to the branch Pages deploys from (`main` of [atlantachristianstudents/adless](https://github.com/atlantachristianstudents/adless)).
2. In the repo, go to **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**, branch `main`, folder `/ (root)`, and save.
4. After a minute the site is live at <https://atlantachristianstudents.github.io/adless/>.

`.nojekyll` must stay in the repo root so GitHub Pages serves files as-is (Jekyll would otherwise exclude folders such as `apps/_template/`).

## Troubleshooting

- **An app still shows an old version after you deploy changes** — you didn't bump `VERSION` in that app's `sw.js`, or the browser kept the previous service worker. Bump the version, hard-reload, or clear the site data.
- **The template folder is missing from the deployed site** — check that `.nojekyll` exists at the repo root.
- **Microphone doesn't work** — the app must be served over HTTPS or `localhost`. On iOS, Safari re-asks for microphone permission per launch; that is an OS rule the apps cannot change.
- **Icons missing on a card** — the card falls back to the registry `icon` emoji, then the site favicon. Add an icon at `apps/<id>/icons/icon-192.png` or set `iconUrl` in `assets/apps.js`.
- **Songbook won't sync** — syncing needs a connection the first time. Tap ↻ in the top bar to retry; the app falls back between the CORS proxy and `songbase.life`.
- **Memorize can't read a PDF** — the PDF must contain selectable text (scanned PDFs need OCR first) and be at most 10 MB / 100 pages. Password-protected PDFs must be unlocked.

Still stuck? Ask in the [Discord](https://discord.gg/77euBtgZjU) or open an issue.

## Support

Join the **Discord** for help, quick questions, bug reports, and app ideas: <https://discord.gg/77euBtgZjU>.

You can also open an issue on GitHub: <https://github.com/atlantachristianstudents/adless/issues>. Issues are best for reproducible bugs and feature requests; Discord is best for quick back-and-forth.

## Contributing

Issues, suggestions, and pull requests are welcome. Before opening a PR:

1. Run a local server and verify the change in the browser.
2. Keep every app self-contained, with no new dependencies, CDN links, or build tools.
3. Bump the relevant service-worker cache version (see above) whenever cached files change.
4. Update the root README, the app's `README.md`, and the `assets/apps.js` header comment when behavior, structure, or registry fields change.

Contributions to the home page should keep it dependency-free and accessible (keyboard operable, ARIA labels accurate).

## License

Please see the repository on GitHub for licensing details (no license file is bundled in this repo yet).
