# Bible Connections

The full and short installed-app names are both **Bible Connections**.

An interactive map of Bible cross-references based on the Holy Bible Recovery Version. All chart data is embedded in `index.html`; no downloads or accounts are needed.

- Hover over a chapter or arc to trace connections; on touch screens, drag across the chart to explore, including from a pinned selection. The preview stays visible after lifting your finger. Click or tap to pin or unpin a connection.
- Dragging on the chart explores connections; swipe outside the chart to scroll the page.
- Choose a book, chapter, and optional verse using the selectors, including on touch screens. The selectors also follow chapter and verse selections on the chart and keyboard navigation; clearing the selection or exploring an arc resets them.
- Expand results beneath the selection summary to browse chapters or verses grouped by their shortest connection step, starting with the selection at step 0. Expand each step to see its results in Bible order.
- Set connection depth from 0 to 9 with the Steps selector or number keys.
- Download the current chart as a PNG after selecting a chapter, verse, or arc. The export reflects the selected connection depth.
- Use left/right arrows to move chapters and up/down arrows to move verses after selecting a chapter.
- Verse hover is off by default. Press V to toggle it; turning it off keeps a hover unpinned and preserves an existing pin. Escape or Clear resets the selection.
- Chapter connections traverse in either direction; verse connections follow outgoing references. Counts include repeated links as described in the app.

## Install and offline use

Serve this folder on HTTPS or localhost and open it once online to cache the app. Use your browser’s Install app or Add to Home Screen action where available. Once cached, the visualization and its data work offline. The source attribution link requires an internet connection.

You can also open `index.html` directly with `file://`; the chart works, but installation and offline caching require a web server. The optional ACS Web Apps back link assumes the app lives under `apps/`.

The folder is self-contained and can be copied to any static host. When changing cached files, increment the version in `sw.js` and update its `FILES` list if needed. Its cache cleanup is limited to this app’s own cache prefix.


## Usage counts

This app reports fixed app/event labels to GoatCounter for visible page opens, opens in standalone/minimal-ui mode (including iOS home-screen mode), and browser-supported `appinstalled` events. Reloads count as opens; returning to an already open app does not. Installed opens are a subset of all opens. Install detection is incomplete, especially on iOS; downloads and uninstall totals are not measured.

No entered content, searches, Scripture, lyrics, full URLs, referrers, cookies, or persistent visitor IDs are sent by this code. Like any external request, the analytics service receives the IP address and browser headers. Do Not Track and Global Privacy Control disable reporting. Localhost, file hosting, and automated browsers do not report. Offline/failed events retry in the same tab, with a limit of 100 events retained for seven days in sessionStorage; closing the tab can lose pending counts. Reports use delivery time, so delayed events appear on the day they are sent. Blockers and interrupted requests can cause missing or duplicate counts. Analytics failures never block app functionality.

Maintainers can view totals at https://atlantachristianstudents.goatcounter.com. In its Events view, filter by `apps/bible-connections/open`, `apps/bible-connections/installed-open`, or `apps/bible-connections/install`. The self-contained `acswebapps-usage` script in `index.html` must stay in sync with the other apps.

Navigation: find **← ACS Web Apps** inside the **?** help menu at the bottom right to return to the app directory.

The help menu identifies Bible Connections as part of the ACS Web Apps project, with a link to the app directory.
