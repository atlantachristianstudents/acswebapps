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
- In scroll presentation, Shift+B / Shift+N adds the previous / next chapter while keeping the visible verse at the same screen position, including when expanding a regular scrolling verse view. Scrollbar space is reserved to keep line wrapping steady.
- In scroll presentation, pronunciation mode takes priority for arrow keys and H/J/K/L (including Shift); these keys move the pronunciation cursor, and the view scrolls as needed to keep the current word visible.
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


## Usage counts

This app reports fixed app/event labels to GoatCounter for visible page opens, opens in standalone/minimal-ui mode (including iOS home-screen mode), and browser-supported `appinstalled` events. Reloads count as opens; returning to an already open app does not. Installed opens are a subset of all opens. Install detection is incomplete, especially on iOS; downloads and uninstall totals are not measured.

No entered content, searches, Scripture, lyrics, full URLs, referrers, cookies, or persistent visitor IDs are sent by this code. Like any external request, the analytics service receives the IP address and browser headers. Do Not Track and Global Privacy Control disable reporting. Localhost, file hosting, and automated browsers do not report. Offline/failed events retry in the same tab, with a limit of 100 events retained for seven days in sessionStorage; closing the tab can lose pending counts. Reports use delivery time, so delayed events appear on the day they are sent. Blockers and interrupted requests can cause missing or duplicate counts. Analytics failures never block app functionality.

Maintainers can view totals at https://atlantachristianstudents.goatcounter.com. In its Events view, filter by `apps/show-words/open`, `apps/show-words/installed-open`, or `apps/show-words/install`. The self-contained `adless-usage` script in `index.html` must stay in sync with the other apps.

Navigation: find **← ACS Web Apps** inside the **?** help menu to return to the app directory.

The help menu identifies Show Words as part of the ACS Web Apps project, with a link to the app directory.
