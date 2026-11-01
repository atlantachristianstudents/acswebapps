# Tunes

Tuner, instrument tuner, audio graph, metronome, tone generator and key/chord detector. No network needed once installed.

## Install (needs the files served over HTTPS once, so the browser can cache them)
- Host this folder on any static host (GitHub Pages, Netlify, Cloudflare Pages), open the URL, then:
  - Android / Chrome / Edge desktop: browser menu > Install app
  - iPhone / iPad: Safari > Share > Add to Home Screen
  - Mac Safari: File > Add to Dock
- After the first load, Tunes runs fully offline.

## Local use
Run `python3 -m http.server 8000` in this folder and open http://localhost:8000 (localhost counts as secure, so install and offline work there too).
Or just open index.html directly; it is fully self-contained, though some browsers re-ask for microphone access each time and cannot install it.

## Microphone permission
Chrome, Edge and Android remember the grant for an installed app, so you are asked once. Tunes also reconnects to the mic by itself when you reopen it. iPhone/iPad Safari may still ask on each launch; that is an iOS rule and cannot be changed by the app.
