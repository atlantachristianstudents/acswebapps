# Bible Translation Explorer

Compare the included component scores for 11 Bible translations in an interactive scatter plot and sortable table. The original explorer’s data and scoring behavior are preserved.

- Adjust literalness (transfer vs. lexical consistency), readability (fluency vs. vocabulary), and their contribution to overall scores. Each ratio ranges from 1:2 to 2:1 and starts at 1:1. The Reset 1:1 button below the readability control and to the left of the literalness axis slider returns all three weights to 1:1.
- Use the alphabetically sorted Show translations checkboxes above the chart to show or hide translations, select chart points, sort the scores, and reset to equal weights. LSV and YLT start unchecked; enable their checkboxes or choose Show all to include them.
- A neutral layout, higher-contrast labels, and spaced table rows make scores easier to scan. The plotting area is square and centered. A vertical Chart size slider stays anchored at the upper right of the chart area with a constant track length while resizing the chart. It adjusts the maximum width from 320 to 900 pixels (640 by default); it shrinks to fit the available screen width. The Reset button below the size slider restores 640 pixels. Axis controls resize with the chart; on phones, both axis controls match the chart column’s width. The size also resets on reload. The readability slider’s colored fill follows its thumb in both vertical and horizontal layouts. On small screens, readability controls stack above the chart, literalness controls remain below it, and only the detailed scores table scrolls horizontally. The chart legend adapts to the available width, and PNG exports are square.
- The chart’s bottom-left legend shows the overall literalness/readability weight split and a background gradient from amber at the lowest visible overall score to green at the highest. The gradient accounts for axis scales and updates with weights and visibility choices. A solid green equal-score line marks the highest visible score, and an amber dashed line marks the lowest; both update with the chart and overlap when scores tie. Equal scores receive the same shade; if all visible scores match, the background is neutral. Drag the thumb on the legend’s literalness/readability bar to adjust overall weighting. This legend control replaces the separate overall slider above the scores table. Arrow keys adjust by one percentage point (Shift: five); Home/End select the allowed extremes. Click the move button in the legend’s upper-right corner to minimize it to only the button in the chart’s bottom-left corner or expand it there (Enter/Space also work). Drag that button to reposition it within the chart, or focus the button and use arrow keys (Shift for larger steps). Its position stays while adjusting weights and visibility, resets on reload, and is included in PNG exports.
- Export the visible scores as CSV or save the chart as a 2200 × 2200 PNG. PNG exports use the full 900-pixel chart layout regardless of the displayed chart size. Each PNG is titled “Bible Translation Comparison” and includes the expanded overall weighting legend at the bottom left and the literalness, readability, and overall ratios with component percentages above the chart, even when the on-screen legend is minimized.
- All data and processing stay in the browser; no accounts, network services, or external assets are needed. Slider and visibility choices reset on reload.

## Run and install

Open `index.html` directly, or serve this folder on any static host. From the repository root, run `python3 -m http.server 8000` and visit <http://localhost:8000/apps/bible-translation-explorer/>.

On HTTPS or localhost, visit once online to cache the app, then use your browser’s install or Add to Home Screen option where supported. The app works offline after caching. Direct `file://` use works without service-worker installation. The optional Adless back link points to the parent directory when hosted within this repository.

## Files and updates

`index.html` contains the interface, embedded scores, styles, and scripts. `manifest.webmanifest` and `icons/icon.svg` provide install metadata; the icon depicts separate scatter-plot points in a clockwise arc from the top of the y-axis toward the lower right, without connecting lines; `sw.js` caches all runtime files. Bump its `VERSION` whenever a cached file changes and update `FILES` when adding assets.


## Usage counts

This app reports fixed app/event labels to GoatCounter for visible page opens, opens in standalone/minimal-ui mode (including iOS home-screen mode), and browser-supported `appinstalled` events. Reloads count as opens; returning to an already open app does not. Installed opens are a subset of all opens. Install detection is incomplete, especially on iOS; downloads and uninstall totals are not measured.

No entered content, searches, Scripture, lyrics, full URLs, referrers, cookies, or persistent visitor IDs are sent by this code. Like any external request, the analytics service receives the IP address and browser headers. Do Not Track and Global Privacy Control disable reporting. Localhost, file hosting, and automated browsers do not report. Offline/failed events retry in the same tab, with a limit of 100 events retained for seven days in sessionStorage; closing the tab can lose pending counts. Reports use delivery time, so delayed events appear on the day they are sent. Blockers and interrupted requests can cause missing or duplicate counts. Analytics failures never block app functionality.

Maintainers can view totals at https://atlantachristianstudents.goatcounter.com. In its Events view, filter by `apps/bible-translation-explorer/open`, `apps/bible-translation-explorer/installed-open`, or `apps/bible-translation-explorer/install`. The self-contained `adless-usage` script in `index.html` must stay in sync with the other apps.

Navigation: find **← Adless** inside the **?** help menu at the bottom right to return to the app directory.

The help menu identifies Bible Translation Explorer as part of the Adless project, with a link to the app directory.
