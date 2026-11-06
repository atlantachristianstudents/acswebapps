# Bible Translation Explorer

Compare the included component scores for 11 Bible translations in an interactive scatter plot and sortable table. The original explorer’s data and scoring behavior are preserved.

- Adjust literalness (transfer vs. lexical consistency), readability (fluency vs. vocabulary), and their contribution to overall scores. Each ratio ranges from 1:2 to 2:1 and starts at 1:1.
- Show or hide translations, select chart points, sort the scores, and reset to equal weights.
- Export the visible scores as CSV or save the chart as a PNG.
- All data and processing stay in the browser; no accounts, network services, or external assets are needed. Slider and visibility choices reset on reload.

## Run and install

Open `index.html` directly, or serve this folder on any static host. From the repository root, run `python3 -m http.server 8000` and visit <http://localhost:8000/apps/bible-translation-explorer/>.

On HTTPS or localhost, visit once online to cache the app, then use your browser’s install or Add to Home Screen option where supported. The app works offline after caching. Direct `file://` use works without service-worker installation. The optional Adless back link points to the parent directory when hosted within this repository.

## Files and updates

`index.html` contains the interface, embedded scores, styles, and scripts. `manifest.webmanifest` and `icons/icon.svg` provide install metadata; `sw.js` caches all runtime files. Bump its `VERSION` whenever a cached file changes and update `FILES` when adding assets.
