# Show Words

An installable, offline verse presenter for projectors, livestreams, and external displays.

The app, home-page listing, and installed shortcut use a presentation-screen icon with text. The editable vector is `icons/icon.svg`, with matching 192px/512px, maskable, and Apple touch PNGs. The app is hosted at `apps/show-words/`. Saved data and settings keep their existing storage keys; open the new URL and reinstall the shortcut if you installed the app from its previous `apps/verses/` address.

## Install (needs the files served over HTTPS once, so the browser can cache them)

Put this whole folder on any static HTTPS host (GitHub Pages, Netlify, Cloudflare Pages, your own site).
Open the address once while online; the app caches itself. After that it works with no connection.

- iPhone/iPad (Safari): Share > Add to Home Screen
- Android (Chrome): menu > Install app
- Windows/Mac/Linux (Chrome or Edge): install icon in the address bar

## Notes

- Your verse text file is chosen once and stored on that device, just like the single-file version.
- The Recovery Version is bundled from `rcv/index.html` and loads automatically on first launch, including offline. Existing saved versions stay available; **Load Recovery Version** also loads the bundled Bible and saves it on the device. No `.txt` files from `rcv/` are used.
- When you replace `index.html` with a newer version, change `VERSION` in `sw.js` so devices pick it up.

## Verse references

Displayed and copied references use consistent book abbreviations across imported versions (for example, `Gen. 1:1` and `1 Cor. 13:4–7`). Chapter and verse use a colon; ranges use an en dash, with the ending chapter included only when it changes (`John 3:36–4:2`). Single-chapter books omit the chapter (`Jude 5–7`), and a single verse never repeats its endpoint. Input book aliases remain supported.

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
