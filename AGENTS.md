# AGENTS.md

Instructions for AI coding agents working in this repository.

## Project overview

ACS Web Apps is a collection of ad-free, independent web apps built by Atlanta Christian Students, hosted on GitHub Pages:

https://atlantachristianstudents.github.io/acswebapps/

The repository root is the deployed website. There is no build system, bundler, or npm dependency setup. Everything is plain HTML, CSS, and vanilla JavaScript served directly.

The home page (`index.html`) displays apps using the registry in `assets/apps.js`. Each app lives in its own folder under `apps/` and must remain self-contained.

## Technology and conventions

- HTML5, CSS3, and vanilla JavaScript only. No frameworks, libraries, or npm packages without explicit approval.
- Use classic scripts, not JavaScript modules or transpilers.
- New home-page code should use modern JavaScript (`const`, `let`, arrow functions). Existing older app code does not need stylistic rewrites.
- Apps should use inline CSS and JavaScript in their main HTML file.
- **Every app's main `index.html` must be directly inside its app folder:** `apps/<id>/index.html`. Never put the main HTML file inside a `dist/`, `build/`, or similar output folder.
- Use CSS custom properties for design tokens and support light and dark themes.
- New interfaces should follow the warm off-white, navy, and gold design system in `apps/_template/`.
- Use SVG files for new icons; do not add icon libraries.
- Preserve compatibility with standalone `file://` and `http://` hosting where applicable.

## Repository structure

| Path | Purpose |
|---|---|
| `index.html` | Home page |
| `404.html` | GitHub Pages not-found page |
| `manifest.json` | Home-page PWA manifest |
| `sw.js` | Home-page service worker |
| `.nojekyll` | Required to prevent GitHub Pages Jekyll processing |
| `assets/apps.js` | App registry (`window.APPS`) |
| `assets/main.js` | Home-page behavior |
| `assets/style.css` | Home-page styling |
| `apps/<id>/` | Individual self-contained apps |
| `apps/_template/` | Starter template for new apps |
| `scripts/validate.py` | Repository validation |
| `.github/workflows/` | GitHub Actions workflows |

Do not delete `.nojekyll`. The root service worker must not handle requests inside `apps/`.

## Architecture and app requirements

1. **Self-contained:** Apps must work when copied or hosted independently. Never link to assets outside their own folder. The only permitted cross-reference is the optional ACS Web Apps project link (`href="../../"`). Service-worker `FILES` entries must point to files within the app.
2. **Registry-driven:** Apps appear on the home page only through `assets/apps.js`. Do not create separate app listings elsewhere.
3. **No generated output:** Everything is hand-edited. Do not introduce build/output folders or generated artifacts.
4. **Relative paths:** Use relative paths throughout individual apps.
5. **Offline-first:** Files needed offline must be listed in the app's service-worker `FILES` array.
6. **Independent storage:** Preserve app-specific localStorage and IndexedDB databases unless a change explicitly requires otherwise.

## Service workers and cache versioning

Every app has its own service worker and version identifier, such as `verse-lookup-v7`.

Whenever an app's `index.html`, manifest, or any file in its cached `FILES` list changes:

- Increment the trailing number in the service-worker `VERSION`.
- Update `FILES` if necessary.
- Ensure new offline requirements are covered.

The root service worker follows the same cache-versioning principle for home-page files.

Never skip version bumps; installed users may otherwise receive stale or broken content.

Service-worker registration must be guarded so apps fail gracefully when hosted through `file://` or unsupported environments.

## Dependencies

Do not add npm packages, frameworks, build tools, or CDN libraries without explicit approval. The zero-dependency setup is intentional.

Approved exception:

- `apps/memorize/vendor/pdfjs/` contains bundled PDF.js for offline PDF text import. Keep parser and resource versions aligned, preserve licenses, and follow the documented classic-script adaptations.

Google Fonts (Inter) is an intentional external dependency on the home page.

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

When bare verse text is needed, strip the reference prefix using the established shared regex. Keep prefixes when an app parses references itself.

Consumers currently include:

- `apps/logostype/scripture-text.js`
- `apps/chronological-bible/app.js`
- `apps/show-words/index.html`
- `apps/verse-designer/index.html`
- `apps/memorize/index.html`

Cache the downloaded text in IndexedDB, with the existing localStorage backup and 15-day TTL. Apps must continue working offline using cached text.

Do not vendor the Scripture file into the repository or add it to service-worker `FILES`. If the source URL or format changes, update all affected consumers and documentation together, then bump their cache versions.

## Show Songs Songbase

The approved Songbase refresh command is:

`apps/show-songs/songbasescraper.py --embed`

It updates `songbase_all.json` and the embedded `songbase-data` script. It validates the complete library, ignores fetch-only timestamp changes, escapes HTML, and bumps the app cache version.

The scheduled workflow in `.github/workflows/update-songbase.yml` runs every six hours using Python's standard library.

Preserve its direct-push behavior and explicit GitHub Pages rebuild step. Be mindful of branch protection when changing repository settings.

Downloaded Songbase libraries use the independent `bigtext-songbase` IndexedDB database. It must survive service-worker cache upgrades.

Songbase blocks browser CORS requests, so apps must fetch the published same-origin snapshot rather than scraping the upstream API directly.

## Usage analytics

Registered apps contain a self-contained inline `adless-usage` script in their main HTML file.

- Keep copies synchronized.
- Use a fixed identifier matching each app's folder.
- Use the established GoatCounter endpoint.
- Do not introduce shared cross-app analytics scripts.
- Only collect fixed open, installed-open, and supported install event labels.
- Never collect user content, searches, full URLs, or referrers.
- Preserve opt-out, local-development guards, failure isolation, and bounded per-tab offline queues.
- Redirect and presentation-only pages must not generate extra opens.
- New apps should copy the script and set their own identifier.

Update usage documentation and bump affected app cache versions when analytics changes.

## Product direction and contributions

Before feature or interface work, read:

- `VISION.md`
- `DESIGN.md`
- `CONTRIBUTING.md`

The primary audience is Christian students and campus gatherings, but the tools remain open to everyone.

Contribution requirements:

- Work on branches and submit pull requests.
- Ordinary changes require another collaborator's approval.
- New apps and major direction changes also require project-lead approval.
- Agree on major scope in an issue before implementation.
- Avoid broad restyling or unnecessary restructuring of existing apps.
- Preserve established public behavior and storage compatibility.

## Adding and modifying features

**New app:**

1. Copy `apps/_template/`.
2. Build directly inside `apps/<id>/`.
3. Keep the main `index.html` in the app folder, never in `dist/` or another nested output folder.
4. Register the app in `assets/apps.js`.
5. Add an app-level `README.md`.
6. Set its status to `"beta"` or `"live"`.
7. Include the standard analytics script with its own app identifier.
8. Configure its manifest and service worker.

**Home-page feature:**

- Implement behavior in `assets/main.js`.
- Implement styling in `assets/style.css`.
- Keep it accessible, keyboard-operable, and dependency-free.

**New registry field:**

- Document it in the `assets/apps.js` header comment.
- Document it in the root README's adding-an-app section.
- Use defensive fallbacks such as `(app.field || fallback)`.

**Existing functionality:**

- Preserve the `window.APPS` registry format.
- Preserve localStorage keys, including `adless-theme` and app-specific keys.
- Preserve card and status naming: `"live"`, `"beta"`, and `"soon"`.
- Make targeted changes to large production files.
- Update relevant documentation alongside implementation changes.

## Validation and testing

Run the repository validator before submitting changes:

`python3 scripts/validate.py --base origin/main`

Useful manual commands:

```sh
# Start a local server
python3 -m http.server 8000

# JavaScript syntax checks
node --check assets/main.js
node --check assets/apps.js
node --check apps/<id>/sw.js

# Validate the home-page manifest
node -e "JSON.parse(require('fs').readFileSync('manifest.json','utf8'));console.log('ok')"
```

The validator checks JavaScript syntax, inline scripts, manifests, registry destinations, offline asset lists, and cache-version increases when using `--base`.

Also verify:

- Pages and manifests return HTTP 200.
- Edited JavaScript passes syntax checks.
- Apps work in a browser on localhost.
- Offline behavior and service-worker caching work.
- Camera and microphone functionality works where applicable.
- Documentation links and diffs are correct.

There is no configured formatter or linter.

## Documentation

Update relevant documentation in the same change:

- `README.md` — repository structure, features, deployment, troubleshooting, and adding apps.
- `VISION.md` — product direction.
- `DESIGN.md` — shared interface rules.
- `CONTRIBUTING.md` — contribution and release workflow.
- `apps/<id>/README.md` — app-specific behavior and installation.
- `assets/apps.js` header — registry field documentation.
- `AGENTS.md` — development conventions and architectural rules.

## Common pitfalls

- Never commit editor or OS backup files such as `*~`, `*.un~`, or `.DS_Store`.
- Never forget service-worker version bumps.
- Keep `404.html` absolute `/acswebapps/` paths; they are intentional for GitHub Pages.
- Preserve the home-page card icon fallback: registry emoji, then `assets/favicon.svg`.
- Do not restructure large production apps for style alone.
- Do not delete `.nojekyll`.
- Do not put an app's main `index.html` inside a `dist/` or build folder.
- Always use the shared RcV source for Scripture text.