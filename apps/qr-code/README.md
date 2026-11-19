# QR Code

Create static, customizable QR codes for links, Wi‑Fi, contacts, and more. Everything is generated on the device — no uploads, no network calls — and the app works fully offline.

## Content types

Pick a type and fill in the fields; the code rebuilds as you type.

- **URL** and **Text**
- **Wi‑Fi** — SSID, password, WPA/WPA2/WPA3, WEP, or open; hidden network support
- **Email** — address, subject, and body (`mailto:`)
- **SMS** — number and message (`SMSTO:`)
- **Phone** (`tel:`)
- **vCard** — name, organization, title, phone, email, website
- **Location** — latitude and longitude (`geo:`)
- **WhatsApp** — number and prefilled message (`wa.me`)
- **Google Review** — Place ID review link
- **PayID** — email, phone, or ABN
- **Calendar** — event title, location, start/end, and description (ICS)

## Style

- **Module shapes**: square, rounded, dots, diamond.
- **Corner eyes**: square, rounded, circle.
- **Size** 160–1024 px (sets the PNG/SVG resolution; the preview scales to match).
- **Error correction** L/M/Q/H.
- **Foreground/background colors**, optional **gradient** foreground, and **transparent background**.
- **Logo upload** — centered with a padded knockout. Adding a logo automatically raises error correction to High to keep the code readable.
- **Theme picker** — Dawn, Paper, Sage, Ocean, Rose, Dusk, Midnight, and a custom palette with font choice. Saved in `localStorage` under `qr-code-settings-v1`.

QR codes include the standard 4-module quiet zone. Exports are available as **PNG** and **SVG** (the SVG keeps vector paths, gradients, and an embedded logo). A contrast warning appears if the colors are too similar.

## Advanced details

**Advanced details** under the preview shows the exact encoded payload (the literal text, `WIFI:` string, `mailto:`, vCard, ICS, or URL that gets encoded) plus spacing math: module count, total grid including the quiet zone, module size in pixels, quiet-zone width, output resolution, error-correction level, active style, colors, and logo coverage. The payload can be copied from the dialog.

## Files

- `index.html` — the whole app: markup, styles, and script in one self-contained file
- `manifest.webmanifest` — PWA manifest
- `sw.js` — service worker that caches the app for offline use (bump `VERSION` when any cached file changes)
- `icons/icon.svg` — app icon
- `vendor/qrcode.js` — vendored [QRCode.js](https://github.com/davidshimjs/qrcodejs) (MIT), used offline; no runtime CDN dependency

## Offline

The service worker caches `index.html`, `manifest.webmanifest`, `icons/icon.svg`, and `vendor/qrcode.js`. QR codes are rendered in memory; only the theme preference is stored.

## Attribution

QR encoding uses QRCode.js by David Shim (based on Kazuhiko Arase's QR Code generator), licensed under the MIT license. "QR Code" is a registered trademark of DENSO WAVE INCORPORATED.

## Checklist

- [x] Copy folder to `apps/qr-code/`
- [x] Replace placeholder text in `index.html`, `manifest.webmanifest`
- [x] Update `<title>`, `<meta name="description">`, manifest colors
- [x] Replace placeholder favicon and `icons/icon.svg`
- [x] Bump `VERSION` in `sw.js` when cached files change
- [x] Register the app in `assets/apps.js`
- [x] Keep everything self-contained: relative paths only

The floating **← Home** link appears when the installed ACS Web Apps directory launches the app. The **?** help menu identifies QR Code as part of the ACS Web Apps project.

Browser pinch-to-zoom is disabled; single-finger scrolling and all controls remain available.

**Check for updates** is available inside the app's **?** help panel. Save your work first; the app checks for a newer version, downloads and activates it, and restarts when needed.
