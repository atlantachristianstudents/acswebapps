# App template

Copy this folder to `apps/<app-id>/` to start a new Adless app (see the root README for the full walkthrough). Everything the app needs lives inside this folder, so it can be copied or hosted anywhere as-is.

## Files

- `index.html` — the whole app: markup, styles, and script, in one self-contained file
- `manifest.webmanifest` — PWA manifest (rename the app, adjust colors)
- `sw.js` — service worker that caches the app for offline use (bump `VERSION` when `index.html` changes)
- `icons/icon.svg` — placeholder icon; replace with real PNG/SVG icons as needed

## Checklist for a new app

1. Copy this folder to `apps/<app-id>/` (folder name = the app's `id`).
2. Replace the placeholder text in `index.html`, `manifest.webmanifest`, and `README.md` (if you add one).
3. Update `<title>`, `<meta name="description">`, and the manifest `name`/`short_name`/`description`/colors.
4. Replace the placeholder favicon and `icons/icon.svg` with your own artwork.
5. Bump `VERSION` in `sw.js` every time you change `index.html`.
6. Register the app in `assets/apps.js` (add an entry with `status: "beta"` or `"live"`).
7. Keep everything self-contained: relative paths only, and never link files outside this folder except the optional `← Adless` back link (`../../`).
