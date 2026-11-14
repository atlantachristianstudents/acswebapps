# AGENTS.md

Instructions for AI coding agents working in this repository.

## Project overview

"ACS Web Apps" is a static home for ad-free web apps built by Atlanta Christian Students, deployed on GitHub Pages at the canonical custom domain **https://acswebapps.com/**. The repo root is the deployed site; there is **no build system, no bundler, and no npm dependencies**. A scheduled GitHub Actions workflow refreshes Show Songs’ Songbase source data; it does not build the apps. Everything is plain HTML, CSS, and vanilla JavaScript served as-is.

The home page (`index.html`) renders an app directory from a registry; each app is an independent, self-contained PWA in its own folder under `apps/`.

## Technology stack

- HTML5, CSS3, vanilla JavaScript (classic scripts, no modules, no transpilers)
- Web APIs: Service Worker, Web App Manifest, localStorage, IndexedDB, Web Audio, getUserMedia, BroadcastChannel/Presentation API (verses external display)
- GitHub Pages (deploy from branch; `.nojekyll` required — see below)

## Important directories and files

| Path | Purpose |
| --- | --- |
| `index.html` | Home page (app directory). Script at the end is minimal; behavior lives in `assets/main.js`. |
| `404.html` | Not-found page. Its back link/favicon base is chosen at runtime: `/acswebapps/` on `atlantachristianstudents.github.io`, `/` on any other host. |
| `manifest.json` | Home-page web-app manifest (standalone PWA; icons in `assets/icons/`). |
| `sw.js` | Home-page service worker (`SHELL` list, `VERSION` `acswebapps-home-vN`). Must not handle `apps/` requests. |
| `CNAME` | Custom domain for GitHub Pages: `acswebapps.com`. The repo root is served at `/` there — see *Custom domain and base paths*. |
| `.github/workflows/update-songbase.yml` | Six-hourly Songbase refresh for Show Songs; uses Python standard library, commits changed snapshots, requests a Pages rebuild. |
| `.github/workflows/validate.yml` | Runs `scripts/validate.py` on pull requests and pushes to `main`. No build step. |
| `.nojekyll` | **Required.** Keeps GitHub Pages from running Jekyll (which would exclude `apps/_template/`). Never delete it. |
| `assets/apps.js` | **App registry.** One object per app in `window.APPS`. Fields documented in the file's header comment. |
| `assets/main.js` | All home-page behavior: theme, filters, search, cards, keyboard shortcuts. |
| `assets/style.css` | Home-page styles; light/dark via CSS custom properties and `data-theme`. |
| `apps/<id>/index.html` | Each app is a single self-contained HTML file (inline CSS/JS). |
| `apps/<id>/sw.js` | Per-app service worker with a `VERSION` cache key. |
| `apps/<id>/manifest.webmanifest` | Per-app PWA manifest. |
| `apps/_template/` | Starter kit for new apps. |
| `scripts/validate.py` | Dependency-free repository validation: JavaScript syntax, inline scripts, manifests, registry destinations, service-worker asset lists, and cache-version increases against a base ref. |

## Coding conventions

- Vanilla JS only; no frameworks, no libraries, no npm packages.
- New home-page code: modern JavaScript (`const`/`let`, arrow functions). Existing large app files may use older ES5-style code — that is fine; don't rewrite it for style alone.
- CSS: design tokens as custom properties on `:root` (see `assets/style.css`); support light and dark via `prefers-color-scheme` plus an explicit `data-theme` override.
- HTML: one file per app, inline `<style>`/`<script>`; self-contained.

## Architectural rules

1. **Self-contained apps.** An app folder must work when copied or hosted on its own. Never link assets outside `apps/<id>/` (no `../../assets/...`). The only allowed cross-references are:
   - the optional ACS Web Apps project link (`href="../../"`, introduced by “[App Name] is part of the ACS Web Apps project”), which simply 404s when the folder is hosted standalone;
   - files listed in that app's own `sw.js` `FILES`.
2. **Registry-driven.** Apps appear on the home page only via `assets/apps.js` (`window.APPS`). Do not add app listings elsewhere.
3. **No build/output artifacts.** There are no generated files; everything is hand-edited.
4. **Offline-first.** Any file an app needs offline must be in that app's `sw.js` `FILES` list, with `VERSION` bumped when contents change.
5. **Relative paths only** inside `apps/`.
6. **One main HTML file per app.** The app's main `index.html` must sit **directly inside its app folder**: `apps/<id>/index.html`. Never put it in `dist/`, `build/`, or any other nested output folder. `apps/<id>/index.html` *is* the app.
7. **IndexedDB for downloaded data.** Anything fetched from the network and kept for later offline use goes in IndexedDB, not localStorage and not the service-worker cache. See *Downloaded data and offline storage*.

## Cache versioning (critical)

The root `sw.js` follows the same rule for the home page (`index.html`, `manifest.json`, `assets/*` in its `SHELL`). Every app `sw.js` has a `VERSION` string like `"verse-lookup-v7"`. When you modify an app's `index.html`, `manifest.webmanifest`, or any file in `FILES`: **bump the version** (increment the trailing number) and update the `FILES` list if needed. Skipping this leaves installed users on stale, broken apps.

## Custom domain and base paths

The site has two valid public origins, and which one you are on decides the base path:

| Host | Base path | Canonical? |
| --- | --- | --- |
| `acswebapps.com` (and `www.acswebapps.com`) | `/` | **Yes** — the custom domain in `CNAME` |
| `atlantachristianstudents.github.io` | `/acswebapps/` | Fallback project site, same content one level deeper |
| `localhost` (local server) | `/` | The repo root is the site root |

GitHub Pages serves the repo root at `/` on the custom domain. The project site keeps the repository name in the path. `404.html` therefore **picks its base path at runtime** from `location.hostname` and rewrites the "← Back to all apps" link and the favicon `href`; keep that pattern and do not hardcode `/acswebapps/` there.

Rules that follow from this:

- **Root-level absolute URLs must use the canonical domain** — `https://acswebapps.com/…`. This covers `og:url`, `og:image`, and any canonical link in `index.html`, plus the live-site links in `README.md`. The project-site URL is the fallback, not the advertised address.
- **Inside `apps/`, always use relative paths.** An app's "← ACS Web Apps" link is `../../`, which resolves to `/` on the custom domain, to `/acswebapps/` on the project site, and 404s only when the folder is hosted on its own. Never point it at a hardcoded absolute URL — that breaks standalone hosting and the project site.
- **Never rewrite the 404 back link to a relative path.** GitHub Pages serves `404.html` from arbitrary depths, so a relative link would resolve against the missing URL's directory and land on a 404 instead of the app directory.
- When you change `index.html`, `manifest.json`, or anything in the home `sw.js` `SHELL`, bump the home cache version (`acswebapps-home-vN`).

## Downloaded data and offline storage

**Always use IndexedDB for data that has to be downloaded.** Scripture text, Songbase libraries, and any other content fetched at runtime belong in IndexedDB — not in localStorage, and not in the service-worker cache.

- Give each app its own database (`show-words-database`, `logostype-database`, `rcv-chronological-database`, `bigtext-songbase`, …). Never reuse another app's database, and keep database names stable so existing downloads survive a release.
- Keep the database independent of service-worker cache versions: bumping a `sw.js` `VERSION` must never wipe downloaded content.
- Write the payload to IndexedDB first, then mirror a small backup plus a fetch timestamp in localStorage. Refresh on a TTL (15 days for Scripture text); if a refresh fails, keep serving the stale copy.
- Validate downloaded data before storing it (line counts, record shapes, versions) and fail with a clear message when the source has changed.
- The service-worker cache is for an app's own files only. Never add a downloaded data file to `FILES`.

## Scripture text source — RcV

**Always use the shared RcV Scripture text source instead of creating or maintaining separate local Scripture text files.**

Source:

https://cdn.rapidfile.cc/VbLdPuh9Yxb4/RcV

This is a static plain-text CDN file, not a JSON API. Fetch it using a normal GET or HEAD request. It supports cross-origin requests and ranged reads.

Important details:

- UTF-8 without BOM.
- CRLF line endings.
- Approximately 4.57 MB.
- One verse per line, prefixed with its abbreviated reference.
- Expected count: 31,103 verse lines, including `Rev. 12:18`.
- Validate the line count after downloading. A mismatch indicates an incomplete or changed source.

When bare verse text is needed, strip the reference prefix using the established shared regex:

```js
/^(?:[1-3]\s*)?[A-Za-z][A-Za-z .-]*?\s*\d+:\d+\s+/
```

Keep prefixes when an app parses references itself.

Consumers currently include:

- `apps/logostype/scripture-text.js`
- `apps/chronological-bible/app.js`
- `apps/show-words/index.html`
- `apps/verse-designer/index.html`
- `apps/test/index.html`

Cache the downloaded text in IndexedDB, with the existing localStorage backup and 15-day TTL. Apps must continue working offline using cached text.

Do not vendor the Scripture file into the repository or add it to service-worker `FILES`. If the source URL or format changes, update all affected consumers and documentation together, then bump their cache versions.

## Dependency management

- Do not add npm packages, build tools, or CDN libraries without explicit approval. The zero-dependency setup is intentional and load-bearing (it works offline, and any app can be copied out of the repo intact).
- Approved exception: `apps/test/vendor/pdfjs/` bundles PDF.js, fonts, and character maps for private, offline PDF text import. Keep parser and resource versions aligned; preserve licenses and the classic-script adaptations documented in that folder.
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

# Validate the repository against the base branch (JavaScript syntax, inline
# scripts, manifests, registry destinations, offline asset lists, and
# cache-version increases against the base ref):
python3 scripts/validate.py --base origin/main
```

Run the validator before submitting changes. It is dependency-free (Python's standard library plus Node's built-in syntax checking) and the same checks run in CI on pull requests and pushes to `main` via `.github/workflows/validate.yml`.

There is no test suite, formatter, or linter configured. Verification means: the validator passes, the server serves every page and manifest with HTTP 200, `node --check` passes on edited JS, and manual browser checks on `localhost` (which counts as secure, so camera/microphone and service workers work).

## Common pitfalls

- **Do not edit files by the names `*~`, `*.un~`, `.DS_Store`** — those are editor/OS backups. Never commit them.
- **Do not put an app's main `index.html` inside a `dist/` or build folder.** It must sit directly in `apps/<id>/`.
- **Do not keep downloaded content in localStorage.** Scripture text, Songbase libraries, and other runtime downloads belong in IndexedDB (see *Downloaded data and offline storage*).
- Forgetting to bump `sw.js` `VERSION` after editing an app (see above).
- `404.html` picks its base path at runtime (see the table above) — keep it absolute, not relative, because GitHub Pages serves the page from arbitrary depths.
- `assets/main.js`'s card icons fall back to the registry `icon` emoji, then `assets/favicon.svg`, if the icon image 404s — this is intentional.
- The home page loads Inter from Google Fonts (a deliberate external dependency); everything else is local.
- The big app files (`apps/show-words/index.html` is ~405 KB) contain large amounts of embedded data and refined interaction code — treat them as production code.

## Rules for adding features

- New **app** → copy `apps/_template/`, build inside `apps/<id>/`, register in `assets/apps.js`, add a `README.md` in the app folder, set `status: "beta"` or `"live"`.
- New **home-page feature** → implement in `assets/main.js` + `assets/style.css`; keep the home page dependency-free and accessible (keyboard operable, ARIA labels kept accurate).
- New **registry field** → document it in the `apps.js` header comment, the root README "Adding a new app" section, and use it defensively (`(app.field || fallback)`).

## Rules for modifying existing functionality

- Preserve public behavior: the `window.APPS` registry format, localStorage keys (`acswebapps-theme`, and each app's own keys), and card/status naming ("live"/"beta"/"soon").
- Do not restructure the large existing apps for style; make targeted fixes only, and test them (see validation commands).
- Keep every change compatible with file:// and http:// hosting of app folders (service-worker registrations must be guarded and fail silently).

## Documentation rules

Update docs in the same change when the implementation changes:

- Root `README.md` — structure, features, adding-an-app workflow, deployment, troubleshooting.
- The relevant `apps/<id>/README.md` — app-specific behavior and install instructions.
- `assets/apps.js` header comment — registry field docs.
- This file — conventions and pitfalls that change.

## Show Songs Songbase refresh

`apps/show-songs/songbasescraper.py --embed` is the approved source-data refresh for `songbase_all.json` and the embedded `songbase-data` script. It validates a complete library, ignores fetch-only timestamp changes, escapes HTML in embedded data, and bumps the app cache version. The scheduled workflow uses only Python’s standard library; preserve its explicit Pages rebuild step for bot commits. In the app, downloaded libraries are stored in the independent `bigtext-songbase` IndexedDB database, which must survive service-worker cache upgrades. Songbase blocks browser CORS requests, so the app fetches the published same-origin snapshot rather than scraping the upstream API directly.


## Usage analytics

Registered apps include an inline `acswebapps-usage` script in their main `index.html`, with a fixed app-folder identifier and the GoatCounter endpoint. Keep these self-contained copies synchronized; do not add a cross-app runtime asset or CDN script. Only fixed open, installed-open, and supported install event labels may be collected; never send user content, searches, full URLs, or referrers. Preserve opt-out and local-development guards, failure isolation, and bounded per-tab offline queues. Update usage documentation and bump each affected app cache version when changing analytics. New apps should copy the script and set their own folder identifier. Redirect and presentation-only pages must not emit extra opens.
