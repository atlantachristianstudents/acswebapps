# Tunes

Tuner, instrument tuner, audio graph, metronome, tone generator, key/chord detector and chord studio (transposer & capo). No network needed once installed.

## Install (needs the files served over HTTPS once, so the browser can cache them)
- Host this folder on any static host (GitHub Pages, Netlify, Cloudflare Pages), open the URL, then:
  - Android / Chrome / Edge desktop: browser menu > Install app
  - iPhone / iPad: Safari > Share > Add to Home Screen
  - Mac Safari: File > Add to Dock
- After the first load, Tunes runs fully offline.

## Local use
Run `python3 -m http.server 8000` in this folder and open http://localhost:8000 (localhost counts as secure, so install and offline work there too).
Or just open index.html directly; it is fully self-contained, though some browsers re-ask for microphone access each time and cannot install it.

## Keyboard shortcuts
Press **1–7** to switch tabs: **1** Tuner, **2** Instruments, **3** Graph, **4** Metronome, **5** Tones, **6** Key and chords, **7** Chord studio. These shortcuts are ignored while editing fields or holding modifier keys. Left and right arrow keys also switch tabs; the space bar starts or stops the metronome when its tab is open.

## Chord studio
Type or paste lyrics with inline chords (e.g. `G   D   Em   C`), pick the chart's key, then:
- **Transpose** shifts every chord (and slash-bass notes) into the new key, respelling with sharps or flats to match the target key.
- **Capo** (frets 1–7) shows the chord shapes to play relative to the capo; the sounding key is shown under the chart.
- The transposed chart updates live, keeps your line layout, and can be copied with one tap. Chart text, key, transpose and capo are remembered on this device.

## Microphone permission
Chrome, Edge and Android remember the grant for an installed app, so you are asked once. Tunes also reconnects to the mic by itself when you reopen it. iPhone/iPad Safari may still ask on each launch; that is an iOS rule and cannot be changed by the app.

When you switch apps, lock the screen, or leave the page, Tunes releases microphone capture and reconnects when you return. If your browser requires a tap to resume audio, tap **Resume listening**. If microphone access fails, use **Enable microphone** to retry. This also applies when launched from the home screen.
