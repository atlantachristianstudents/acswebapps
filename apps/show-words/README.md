# Verse Lookup

The full and short installed-app names are both **Show Words**.

An installable, offline verse presenter for projectors, livestreams, and external displays.

## Install (needs the files served over HTTPS once, so the browser can cache them)

Put this whole folder on any static HTTPS host (GitHub Pages, Netlify, Cloudflare Pages, your own site).
Open the address once while online; the app caches itself. After that it works with no connection.

- iPhone/iPad (Safari): Share > Add to Home Screen
- Android (Chrome): menu > Install app
- Windows/Mac/Linux (Chrome or Edge): install icon in the address bar

## Notes

- The Scripture text (RcV) is downloaded the same way as in Logostype: the loader built into `index.html` fetches it from the configured Scripture API and caches it in IndexedDB with a localStorage backup, refreshing the cache after 15 days. First use and cache refresh need an internet connection; a fresh cached copy works offline. The text is no longer bundled inside `index.html`.
- After RcV, NIV, KJV, ESV, NLT, NKJV, CSB, and NASB load automatically in that order from a pinned revision of [Beblia’s XML repository](https://github.com/Beblia/Holy-Bible-XML-Format). Next, Greek **SBLGNT** and **THGNT** (New Testament), then Hebrew **Leningrad Codex** and **Aleppo Codex** (Old Testament), load from the same pinned source. All eleven additional editions are temporary: fetched with `cache: "no-store"`, held only in memory, and excluded from saved versions and exported copies. They require an internet connection each session; RcV and imported text retain their existing offline behavior. Failed translations have a **Retry translations** control. Embedded copies do not fetch additional translations.
- Additional verse text files can be imported and stored on that device.
- In search and presentation modes, press **1–9** to select versions 1–9 or **0** to select the tenth version. Digits typed in a text field continue to enter text.
- Press **X** on a selected search result or while viewing a verse in presentation or side-by-side mode to open its Hebrew or Greek text analysis on BibleHub in a new tab. With pronunciation active in presentation, **X** follows the pronunciation cursor. In a scrolling presentation or slide, it otherwise opens the first visible verse, even when that verse is partly scrolled offscreen. On a fitted slide, it uses the first verse when pronunciation is off.
- In side-by-side comparison (**S**), the selected translation appears first. Click a translation row or press **1–9** (**0** selects the tenth version) to select it. Number shortcuts use the original version numbers, even when the rows move. **F** fits all comparison rows to the screen; press it again to restore the previous size. Fill refits when the verse, selected translation, or window size changes. **Backspace** resets comparison text size. The **BibleHub ↗** button or **H** shortcut opens the currently displayed verse’s BibleHub parallel page in a new tab (internet required).
- Enter exits present mode while keeping browser full screen active. Shift+F toggles full screen.
- In scroll presentation, Shift+B / Shift+N adds the previous / next chapter while keeping the visible verse at the same screen position, including when expanding a regular scrolling verse view. Scrollbar space is reserved to keep line wrapping steady.
- Exiting scroll presentation returns the cursor to the most recent first fully visible verse. Chapter context retains the last matching result when the visible verse is outside the search results; existing multi-verse selections are preserved.
- In scroll presentation, turning on pronunciation starts at the first fully visible word in the text area. Pronunciation mode takes priority for arrow keys and H/J/K/L (including Shift); these keys move the pronunciation cursor, and the view scrolls as needed to keep the current word visible.
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

Maintainers can view totals at https://atlantachristianstudents.goatcounter.com. In its Events view, filter by `apps/show-words/open`, `apps/show-words/installed-open`, or `apps/show-words/install`. The self-contained `acswebapps-usage` script in `index.html` must stay in sync with the other apps.

Navigation: find **← ACS Web Apps** inside the **?** help menu to return to the app directory.

The help menu identifies Show Words as part of the ACS Web Apps project, with a link to the app directory.

Browser pinch-to-zoom is disabled. Single-finger scrolling, input editing, and the app’s own controls remain available.

Press **⌘+U** or choose **Check for updates** in the app’s **?** help panel. Save your work first. The app checks for a newer version, downloads and activates it, and restarts when needed. Status messages cover offline use, failures, and an already-current app. Downloaded content in IndexedDB is preserved.

Translation buttons and side-by-side rows support click-and-drag reordering; number shortcuts follow the new order and the active translation stays selected. Reordering applies to the current session; automatic translations use their default order on reload. Temporary translations remain session-only. Removing one translation or all translations requires a theme-matched confirmation dialog with Cancel and Remove buttons; Escape cancels.

Greek and Hebrew editions provide verse text without a critical apparatus. Hebrew source numbering is preserved and can differ from English numbering; source omissions remain unavailable. Use version buttons beyond version 10, or drag an edition earlier to give it a number shortcut. Hebrew verse bodies use automatic text direction.
