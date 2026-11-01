# Adless

Free, ad-free web apps by Atlanta Christian Students — tuner, verse presenter, and more. Everything runs in the browser: no accounts, no tracking, no ads.

Live site: https://atlantachristianstudents.github.io/adless/

## Structure

```
index.html            Home page (app directory)
404.html              Not-found page
.nojekyll             Tells GitHub Pages to serve files as-is
assets/
  apps.js             App registry — edit this to add/list apps
  main.js             Search, tag filters, theme toggle
  style.css           Site styles (light/dark)
  favicon.svg
apps/
  _template/          Copy this folder to start a new app
  <app-id>/index.html Each app lives in its own folder
```

## Adding a new app

1. Copy `apps/_template/` to `apps/<app-id>/` (e.g. `apps/tuner/`).
2. Build the app inside that folder. Use relative paths so it works under `/adless/`.
3. In `assets/apps.js`, add or update its entry and set `status` to `"live"` (or `"beta"`):

   ```js
   {
     id: "tuner",
     name: "Tuner",
     description: "Chromatic instrument tuner using your device microphone.",
     icon: "🎸",
     tags: ["Worship", "Music"],
     status: "live"
   }
   ```

4. Commit and push. The card appears on the home page automatically.

Statuses: `live`, `beta`, and `soon` (shown as a non-clickable "Coming soon" card).

## Deploying on GitHub Pages

1. Push these files to the `main` branch of `atlantachristianstudents/adless`.
2. In the repo go to **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**, branch `main`, folder `/ (root)`, and save.
4. After a minute the site is live at `https://atlantachristianstudents.github.io/adless/`.

## Notes

- Apps that use the microphone (like the tuner) need HTTPS, which GitHub Pages provides.
- Keep each app self-contained in its own folder so apps can't break each other.
- To preview locally: `python3 -m http.server` in the repo folder, then open http://localhost:8000.
