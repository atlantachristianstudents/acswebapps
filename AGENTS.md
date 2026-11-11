# AGENTS.md

Instructions for AI coding agents working in this repository.

## Project overview

"Adless" is a static home for ad-free web apps built by Atlanta Christian Students, deployed on GitHub Pages at `https://atlantachristianstudents.github.io/adless/`. The repo root is the deployed site; there is **no build system, no bundler, and no npm dependencies**. A scheduled GitHub Actions workflow refreshes Big Text’s Songbase source data; it does not build the apps. Everything is plain HTML, CSS, and vanilla JavaScript served as-is.

The home page (`index.html`) renders an app directory from a registry; each app is an independent, self-contained PWA in its own folder under `apps/`.

## Technology stack

- HTML5, CSS3, vanilla JavaScript (classic scripts, no modules, no transpilers)
- Web APIs: Service Worker, Web App Manifest, localStorage, IndexedDB, Web Audio, getUserMedia, BroadcastChannel/Presentation API (verses external display)
- GitHub Pages (deploy from branch; `.nojekyll` required — see below)

## Important directories and files

| Path | Purpose |
| --- | --- |
| `index.html` | Home page (app directory). Script at the end is minimal; behavior lives in `assets/main.js`. |
| `404.html` | Not-found page. Links are absolute (`/adless/...`) because GitHub Pages serves it from arbitrary depths. |
| `manifest.json` | Home-page web-app manifest (standalone PWA; icons in `assets/icons/`). |
| `sw.js` | Home-page service worker (`SHELL` list, `VERSION` `adless-home-vN`). Must not handle `apps/` requests. |
| `.github/workflows/update-songbase.yml` | Six-hourly Songbase refresh for Big Text; uses Python standard library, commits changed snapshots, requests a Pages rebuild. |
| `.nojekyll` | **Required.** Keeps GitHub Pages from running Jekyll (which would exclude `apps/_template/`). Never delete it. |
| `assets/apps.js` | **App registry.** One object per app in `window.APPS`. Fields documented in the file's header comment. |
| `assets/main.js` | All home-page behavior: theme, filters, search, cards, keyboard shortcuts. |
| `assets/style.css` | Home-page styles; light/dark via CSS custom properties and `data-theme`. |
| `apps/<id>/index.html` | Each app is a single self-contained HTML file (inline CSS/JS). |
| `apps/<id>/sw.js` | Per-app service worker with a `VERSION` cache key. |
| `apps/<id>/manifest.webmanifest` | Per-app PWA manifest. |
| `apps/_template/` | Starter kit for new apps. |

## Coding conventions

- Vanilla JS only; no frameworks, no libraries, no npm packages.
- New home-page code: modern JavaScript (`const`/`let`, arrow functions). Existing large app files may use older ES5-style code — that is fine; don't rewrite it for style alone.
- CSS: design tokens as custom properties on `:root` (see `assets/style.css`); support light and dark via `prefers-color-scheme` plus an explicit `data-theme` override.
- HTML: one file per app, inline `<style>`/`<script>`; self-contained.

## Architectural rules

1. **Self-contained apps.** An app folder must work when copied or hosted on its own. Never link assets outside `apps/<id>/` (no `../../assets/...`). The only allowed cross-references are:
   - the optional `← Adless` back link (`href="../../"`), which simply 404s when the folder is hosted standalone;
   - files listed in that app's own `sw.js` `FILES`.
2. **Registry-driven.** Apps appear on the home page only via `assets/apps.js` (`window.APPS`). Do not add app listings elsewhere.
3. **No build/output artifacts.** There are no generated files; everything is hand-edited.
4. **Offline-first.** Any file an app needs offline must be in that app's `sw.js` `FILES` list, with `VERSION` bumped when contents change.
5. **Relative paths only** inside `apps/`.

## Cache versioning (critical)

The root `sw.js` follows the same rule for the home page (`index.html`, `manifest.json`, `assets/*` in its `SHELL`). Every app `sw.js` has a `VERSION` string like `"verse-lookup-v7"`. When you modify an app's `index.html`, `manifest.webmanifest`, or any file in `FILES`: **bump the version** (increment the trailing number) and update the `FILES` list if needed. Skipping this leaves installed users on stale, broken apps.

## Dependency management

- Do not add npm packages, build tools, or CDN libraries without explicit approval. The zero-dependency setup is intentional and load-bearing (it works offline, and any app can be copied out of the repo intact).
- Approved exception: `apps/memorize/vendor/pdfjs/` bundles PDF.js, fonts, and character maps for private, offline PDF text import. Keep parser and resource versions aligned; preserve licenses and the classic-script adaptations documented in that folder.
- If an image/icon is needed, add it as an SVG file under the app's `icons/`; do not pull in icon font packages.

## Build, run, and validation commands

```sh
# Serve the site (run from the repo root); Python and Node are both fine:
python3 -m http.server 8000            # open http://localhost:8000

# Syntax-check the JS files after editing:
node --check assets/main.js
node --check assets/apps.js
node --check apps/<id>/sw.js

# Quick JSON validation of manifests:
node -e "JSON.parse(require('fs').readFileSync('manifest.json','utf8'));console.log('ok')"
```

There is no test suite, formatter, or linter configured. Verification means: the server serves every page and manifest with HTTP 200, `node --check` passes on edited JS, and manual browser checks on `localhost` (which counts as secure, so camera/ microphone and service workers work).

## Common pitfalls

- **Do not edit files by the names `*~`, `*.un~`, `.DS_Store`** — those are editor/OS backups. Never commit them.
- Forgetting to bump `sw.js` `VERSION` after editing an app (see above).
- `404.html` uses absolute paths (`/adless/`) — they are correct for the GitHub Pages project site but break on other hosts; don't "fix" them to relative paths.
- `assets/main.js`'s card icons fall back to the registry `icon` emoji, then `assets/favicon.svg`, if the icon image 404s — this is intentional.
- The home page loads Inter from Google Fonts (a deliberate external dependency); everything else is local.
- The big app files (`apps/show-words/index.html` is ~405 KB) contain large amounts of embedded data and refined interaction code — treat them as production code.

## Rules for adding features

- New **app** → copy `apps/_template/`, build inside `apps/<id>/`, register in `assets/apps.js`, add a `README.md` in the app folder, set `status: "beta"` or `"live"`.
- New **home-page feature** → implement in `assets/main.js` + `assets/style.css`; keep the home page dependency-free and accessible (keyboard operable, ARIA labels kept accurate).
- New **registry field** → document it in the `apps.js` header comment, the root README "Adding a new app" section, and use it defensively (`(app.field || fallback)`).

## Rules for modifying existing functionality

- Preserve public behavior: the `window.APPS` registry format, localStorage keys (`adless-theme`, and each app's own keys), and card/status naming ("live"/"beta"/"soon").
- Do not restructure the large existing apps for style; make targeted fixes only, and test them (see validation commands).
- Keep every change compatible with file:// and http:// hosting of app folders (service-worker registrations must be guarded and fail silently).

## Documentation rules

Update docs in the same change when the implementation changes:

- Root `README.md` — structure, features, adding-an-app workflow, deployment, troubleshooting.
- The relevant `apps/<id>/README.md` — app-specific behavior and install instructions.
- `assets/apps.js` header comment — registry field docs.
- This file — conventions and pitfalls that change.

## Big Text Songbase refresh

`apps/show-songs/songbasescraper.py --embed` is the approved source-data refresh for `songbase_all.json` and the embedded `songbase-data` script. It validates a complete library, ignores fetch-only timestamp changes, escapes HTML in embedded data, and bumps the app cache version. The scheduled workflow uses only Python’s standard library; preserve its explicit Pages rebuild step for bot commits. In the app, downloaded libraries are stored in the independent `bigtext-songbase` IndexedDB database, which must survive service-worker cache upgrades. Songbase blocks browser CORS requests, so the app fetches the published same-origin snapshot rather than scraping the upstream API directly.
