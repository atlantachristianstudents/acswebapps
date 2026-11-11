# Bible Connections

An interactive map of Bible cross-references based on the Holy Bible Recovery Version. All chart data is embedded in `index.html`; no downloads or accounts are needed.

- Hover over a chapter or arc to trace connections; click or tap to pin it.
- Choose a book, chapter, and optional verse using the selectors, including on touch screens.
- Set connection depth from 0 to 9 with the Steps selector or number keys.
- Use left/right arrows to move chapters and up/down arrows to move verses after selecting a chapter.
- Verse hover is off by default. Press V to toggle it; Escape or Clear resets the selection.
- Chapter connections traverse in either direction; verse connections follow outgoing references. Counts include repeated links as described in the app.

## Install and offline use

Serve this folder on HTTPS or localhost and open it once online to cache the app. Use your browser’s Install app or Add to Home Screen action where available. Once cached, the visualization and its data work offline. The source attribution link requires an internet connection.

You can also open `index.html` directly with `file://`; the chart works, but installation and offline caching require a web server. The optional Adless back link assumes the app lives under `apps/`.

The folder is self-contained and can be copied to any static host. When changing cached files, increment the version in `sw.js` and update its `FILES` list if needed. Its cache cleanup is limited to this app’s own cache prefix.
