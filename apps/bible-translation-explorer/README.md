# Bible Translation Explorer

Compare the included component scores for 11 Bible translations in an interactive scatter plot and sortable table. The original explorer’s data and scoring behavior are preserved.

- Adjust literalness (transfer vs. lexical consistency), readability (fluency vs. vocabulary), and their contribution to overall scores. Each ratio ranges from 1:2 to 2:1 and starts at 1:1. The Reset 1:1 button below the readability control and to the left of the literalness axis slider returns all three weights to 1:1.
- Use the alphabetically sorted Show translations checkboxes above the chart to show or hide translations, select chart points, sort the scores, and reset to equal weights. LSV and YLT start unchecked; enable their checkboxes or choose Show all to include them.
- A neutral layout, higher-contrast labels, and spaced table rows make scores easier to scan. The plotting area is square and centered. A vertical Chart size slider on its right adjusts the maximum width from 320 to 900 pixels (640 by default); it shrinks to fit the available screen width. The Reset button below the size slider restores 640 pixels. Axis controls resize with the chart; on phones, both axis controls match the chart column’s width. The size also resets on reload. On small screens, readability controls stack above the chart, literalness controls remain below it, and only the detailed scores table scrolls horizontally. The chart legend adapts to the available width, and PNG exports are square.
- The chart’s bottom-left legend shows the overall literalness/readability weight split and a background gradient from amber at the lowest visible overall score to green at the highest. The gradient accounts for axis scales and updates with weights and visibility choices. A solid green equal-score line marks the highest visible score, and an amber dashed line marks the lowest; both update with the chart and overlap when scores tie. Equal scores receive the same shade; if all visible scores match, the background is neutral. Drag the thumb on the legend’s literalness/readability bar to adjust overall weighting. This legend control replaces the separate overall slider above the scores table. Arrow keys adjust by one percentage point (Shift: five); Home/End select the allowed extremes. Click the move button in the legend’s upper-right corner to minimize it to only the button or expand it (Enter/Space also work). Drag that button to reposition it within the chart, or focus the button and use arrow keys (Shift for larger steps). Its position stays while adjusting weights and visibility, resets on reload, and is included in PNG exports.
- Export the visible scores as CSV or save the chart as a PNG.
- All data and processing stay in the browser; no accounts, network services, or external assets are needed. Slider and visibility choices reset on reload.

## Run and install

Open `index.html` directly, or serve this folder on any static host. From the repository root, run `python3 -m http.server 8000` and visit <http://localhost:8000/apps/bible-translation-explorer/>.

On HTTPS or localhost, visit once online to cache the app, then use your browser’s install or Add to Home Screen option where supported. The app works offline after caching. Direct `file://` use works without service-worker installation. The optional Adless back link points to the parent directory when hosted within this repository.

## Files and updates

`index.html` contains the interface, embedded scores, styles, and scripts. `manifest.webmanifest` and `icons/icon.svg` provide install metadata; `sw.js` caches all runtime files. Bump its `VERSION` whenever a cached file changes and update `FILES` when adding assets.
