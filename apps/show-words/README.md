# Verse Lookup

An installable, offline verse presenter for projectors, livestreams, and external displays.

## Install (needs the files served over HTTPS once, so the browser can cache them)

Put this whole folder on any static HTTPS host (GitHub Pages, Netlify, Cloudflare Pages, your own site).
Open the address once while online; the app caches itself. After that it works with no connection.

- iPhone/iPad (Safari): Share > Add to Home Screen
- Android (Chrome): menu > Install app
- Windows/Mac/Linux (Chrome or Edge): install icon in the address bar

## Notes

- The Scripture text (RcV) is downloaded the same way as in Logostype: the loader built into `index.html` fetches it from the configured Scripture API and caches it in IndexedDB with a localStorage backup, refreshing the cache after 15 days. First use and cache refresh need an internet connection; a fresh cached copy works offline. The text is no longer bundled inside `index.html`.
- Additional verse text files can be imported and stored on that device.
- When you replace `index.html` with a newer version, change `VERSION` in `sw.js` so devices pick it up.

## External display

With a display connected, Present puts the verses on that screen and turns this device into the control panel.

- Chrome/Edge (Android, desktop): Display... > Cast or connected display. Needs https. The display page loads on the TV/Chromecast.
- Any browser: Display... > Open a display window, then drag it to the other screen (iPad Stage Manager, Android desktop mode, computers).
- iPhone/iPad Safari cannot send a page to a wired or AirPlay display; it only mirrors the whole screen.

Keep `display.html` in the same folder as `index.html`. Settings: cog panel > Presenting (Auto / This screen / External display).

## Import outline

Cog panel → **Import outline…** reads a PDF or .txt outline and puts the verses each point cites into the search box, one part per point, separated by `|` (the Scripture Reading becomes the first part). Press Enter to present them as slides.

- A point cites verses after its last em dash (`…—Rev. 2:4; 3:8`) or in parentheses (`(Rev. 2:14)`).
- `v.`/`vv.` and a bare `2:7` take their book or chapter from the verse before; the status line says how many did, so check those.
- PDFs are read in the browser (no upload). Scanned PDFs without text cannot be read.
