# Adless

Free, ad-free web apps by Atlanta Christian Students — big text display, tuner, verse presenter, and more. Everything runs in the browser: no accounts, no tracking, no ads.

Live site: <https://atlantachristianstudents.github.io/adless/>

## Apps

| App | Description | Status |
| --- | --- | --- |
| [Memorize](https://atlantachristianstudents.github.io/adless/apps/memorize/) | Paste or import a text file or PDF, recall it on a blank page, then check missing, changed, and extra words. Optional Test mode requests full-screen, accepts Shift + Command + Enter to submit, and requires a passcode to restart or edit. | beta |
| [Big Text](https://atlantachristianstudents.github.io/adless/apps/big-text/) | Type a hymn number or short text and it scales to fill the screen, for projectors and livestreams. | live |
| [Tuner](https://atlantachristianstudents.github.io/adless/apps/tunes/) | Chromatic instrument tuner, metronome, tone generator and chord detector using your device microphone. | live |
| [Verse Lookup](https://atlantachristianstudents.github.io/adless/apps/verses/) | Look up Bible verses and display them full-screen for projectors and livestreams, with external-display support. | live |

## Features

- No accounts, no tracking, no ads — everything runs in the browser.
- The home page and every app are installable PWAs with service workers; after the first visit they work offline.
- Light/dark themes on the home page; per-app theming inside each app.
- Everything is stored on the device; nothing is uploaded anywhere.

## Technologies

Plain HTML, CSS, and JavaScript. No frameworks, no build system, no npm dependencies. Hosted on GitHub Pages.

## Project structure

```
index.html                 Home page (app directory)
404.html                   Not-found page
manifest.json              Home page web-app manifest (standalone PWA)
sw.js                      Home page service worker (skips apps/, which have their own)
.nojekyll                  Tells GitHub Pages to serve files as-is (no Jekyll processing)
assets/
  apps.js                  App registry — edit this to add/list apps
  main.js                  Theme toggle, tag filters, search, keyboard shortcuts, cards
  style.css                Site styles (light/dark)
  favicon.svg              Site icon
  icons/                   Home-page PWA icons (192, 512, maskable, apple-touch)
apps/
  _template/               Copy this folder to start a new app
  memorize/                Memorization practice with word comparison
  big-text/                Big Text app (full-screen hymn numbers and text)
  tunes/                   Tuner app (microphone, metronome, tone generator)
  verses/                  Verse Lookup app (verse presenter)
```

Each app folder contains `index.html`, `manifest.webmanifest`, `sw.js`, `icons/`, and a `README.md`.

## Requirements

- Any modern browser to use the site.
- For local development: any static file server (see below). Python 3 and Node.js are useful, but anything that serves files works.
- Apps that use the microphone (Tuner) require HTTPS when deployed — GitHub Pages provides this. `localhost` also counts as secure.

## Local development

Run a static server from the repo root so relative paths and service workers work:

```sh
python3 -m http.server 8000
```

Then open <http://localhost:8000>.

Editing any file takes effect after a reload. For service-worker changes, see the note below about cache versions.

## Adding a new app

1. Copy `apps/_template/` to `apps/<app-id>/` (e.g. `apps/tuner/`). The folder name is the app's `id`.
2. Build the app inside `apps/<app-id>/index.html`. Keep everything self-contained in that folder and use **relative paths only**, so the app works offline and on any static host. See `apps/_template/README.md` for the checklist.
3. Register the app in `assets/apps.js` by adding an entry and setting `status` to `"live"` (or `"beta"`):

   ```js
   {
     id: "tuner",
     name: "Tuner",
     description: "Chromatic instrument tuner using your device microphone.",
     icon: "🎸",          // fallback emoji shown on the card if no icon image exists
     tags: ["Worship", "Music"],
     status: "live"
   }
   ```

4. Commit and push. The card appears on the home page automatically.

Statuses: `live`, `beta`, and `soon` (`soon` renders a non-clickable "Coming soon" card). Cards use `apps/<id>/icons/icon-192.png` by default; set an optional `iconUrl` to point elsewhere.

### Service-worker cache versions

The home page has its own `sw.js` (`VERSION` = `adless-home-vN`); bump it when you change `index.html`, `manifest.json`, or anything in the home `SHELL` list (including `assets/`). It deliberately ignores requests under `apps/`.

Every app's `sw.js` has a `VERSION` string (e.g. `"verse-lookup-v7"`). **Bump it whenever you change an app's `index.html` or the files listed in `FILES`**, otherwise installed devices keep serving the old cached version. Update the `FILES` list if the app gains new files.

## Deploying on GitHub Pages

1. Push these files to the branch Pages deploys from (`main` of [atlantachristianstudents/adless](https://github.com/atlantachristianstudents/adless)).
2. In the repo, go to **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**, branch `main`, folder `/ (root)`, and save.
4. After a minute the site is live at <https://atlantachristianstudents.github.io/adless/>.

`.nojekyll` must stay in the repo root so GitHub Pages serves files as-is (Jekyll would otherwise exclude folders such as `apps/_template/`).

## Troubleshooting

- **An app still shows an old version after you deploy changes** — you didn't bump `VERSION` in that app's `sw.js`, or the browser kept the previous service worker. Bump the version, hard-reload, or clear the site data.
- **The template folder is missing from the deployed site** — check that `.nojekyll` exists at the repo root.
- **Microphone doesn't work** — the app must be served over HTTPS or `localhost`. On iOS, Safari re-asks for microphone permission per launch; that's an OS rule the apps can't change.
- **Icons missing on a card** — the card falls back to the registry `icon` emoji, then the site favicon. Add an icon at `apps/<id>/icons/icon-192.png` or set `iconUrl` in `assets/apps.js`.

## Contributing

Issues and suggestions are welcome: <https://github.com/atlantachristianstudents/adless/issues>. Contributions can come through pull requests to the repository. Before opening a PR, run a local server and verify your changes in the browser; keep every app self-contained, with no new dependencies.

## License

Please see the repository on GitHub for licensing details (no license file is bundled in this repo yet).
