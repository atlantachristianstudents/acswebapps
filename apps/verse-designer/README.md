# Verse Designer

Create beautiful Bible verse wallpapers and shareable images. Type a verse, pick a layout, background, and typography, then export the result as a full-resolution PNG. Everything runs client-side with no dependencies — once installed it works fully offline.

## Features

- **Verse lookup** — pick a book, chapter, and verse (or a range like `16-18`) and press **Look up**. Text comes from the same RcV source Logostype uses; it reuses Logostype's cached download when available, caches locally (15-day TTL), and only fetches when online.

- **Screen-size presets** — Phone (1080×2340), Story (1080×1920), Square (1080×1080), Desktop (2560×1440), Wide (3440×1440).
- **Layout presets** — Centered, Left, Card (rounded translucent panel), Line (accent rules above and below), and Quote (oversized quotation mark).
- **Backgrounds** — 12 gradient presets (Dawn, Deep sea, Violet, Sunset, Forest, Night, …), a **Custom gradient** (free color + angle control), or your **own image** — see below.
- **Custom image background** — pick any photo from your device. Advanced controls add fit (cover / contain / stretch), position, blur, a dim/tint overlay, and automatic text color from the image tone.
- **Advanced mode** — toggle ⚙ Advanced in the top bar to unlock: letter spacing, line height, text opacity, text shadow, ALL-CAPS verse transform, reference size, uppercase reference, vertical position, padding, vignette strength, and film grain.
- **Typography** — serif / sans / mono system font stacks, weight, size, verse text color, and an accent color (used for the reference, rules, and card border).
- **Auto-fit** — long verses automatically shrink to fill the safe area; turn it off to set the size manually.
- **Export** — Download PNG at the preset's full resolution, or copy the image straight to the clipboard.
- **Surprise me** — randomize background, layout, and font for quick inspiration.

## Usage

Open the app, edit the verse text and reference, tweak the controls, and press **Download PNG**. Designs (including your imported image, downscaled to fit localStorage) are saved automatically, so reloading the app restores your last design.

## Install

Visit the app on the deployed Adless site (or any HTTPS host) and use your browser's "Install app" option. The app is cached by its service worker for offline use.

## Files

- `index.html` — the whole app: markup, styles, canvas renderer, and script in one self-contained file
- `manifest.webmanifest` — PWA manifest
- `sw.js` — service worker cache (`verse-designer-vN`; bump when `index.html` changes)
- `icons/icon.svg` — app icon

## Technical notes

- The design is rendered by a single `render(canvas, scale)` function. The preview canvas draws at half scale; PNG export renders the same code at full preset resolution, so the export always matches the preview.
- Text is wrapped and auto-fit entirely with `CanvasRenderingContext2D` (binary search on font size). No libraries, no HTML-to-image tricks.
- Fonts use OS-bundled stacks only (Georgia, Palatino, system-ui, Trebuchet, Consolas), keeping the app dependency-free and offline-safe.
- Settings persist under the `verse-designer-state` localStorage key. Imported images are downscaled to 1600px JPEG data URLs before saving; if storage is full the image is dropped from persistence rather than failing the whole save.
- Custom image backgrounds are drawn client-side from a same-origin data URL, so canvas export (toBlob) is never tainted.


## Usage counts

This app reports fixed app/event labels to GoatCounter for visible page opens, opens in standalone/minimal-ui mode (including iOS home-screen mode), and browser-supported `appinstalled` events. Reloads count as opens; returning to an already open app does not. Installed opens are a subset of all opens. Install detection is incomplete, especially on iOS; downloads and uninstall totals are not measured.

No entered content, searches, Scripture, lyrics, full URLs, referrers, cookies, or persistent visitor IDs are sent by this code. Like any external request, the analytics service receives the IP address and browser headers. Do Not Track and Global Privacy Control disable reporting. Localhost, file hosting, and automated browsers do not report. Offline/failed events retry in the same tab, with a limit of 100 events retained for seven days in sessionStorage; closing the tab can lose pending counts. Reports use delivery time, so delayed events appear on the day they are sent. Blockers and interrupted requests can cause missing or duplicate counts. Analytics failures never block app functionality.

Maintainers can view totals at https://atlantachristianstudents.goatcounter.com. In its Events view, filter by `apps/verse-designer/open`, `apps/verse-designer/installed-open`, or `apps/verse-designer/install`. The self-contained `adless-usage` script in `index.html` must stay in sync with the other apps.
