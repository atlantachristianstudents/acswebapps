# Tunes

Tuner, instrument tuner, audio graph, metronome, tone generator, key/chord detector and chord studio (transposer & capo). No network needed once installed. The app opens without a header; navigation back to ACS Web Apps is in the bottom-right **?** menu.

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


## Usage counts

This app reports fixed app/event labels to GoatCounter for visible page opens, opens in standalone/minimal-ui mode (including iOS home-screen mode), and browser-supported `appinstalled` events. Reloads count as opens; returning to an already open app does not. Installed opens are a subset of all opens. Install detection is incomplete, especially on iOS; downloads and uninstall totals are not measured.

No entered content, searches, Scripture, lyrics, full URLs, referrers, cookies, or persistent visitor IDs are sent by this code. Like any external request, the analytics service receives the IP address and browser headers. Do Not Track and Global Privacy Control disable reporting. Localhost, file hosting, and automated browsers do not report. Offline/failed events retry in the same tab, with a limit of 100 events retained for seven days in sessionStorage; closing the tab can lose pending counts. Reports use delivery time, so delayed events appear on the day they are sent. Blockers and interrupted requests can cause missing or duplicate counts. Analytics failures never block app functionality.

Maintainers can view totals at https://atlantachristianstudents.goatcounter.com. In its Events view, filter by `apps/tunes/open`, `apps/tunes/installed-open`, or `apps/tunes/install`. The self-contained `adless-usage` script in `index.html` must stay in sync with the other apps.

Navigation: find **← ACS Web Apps** inside the **?** help menu at the bottom right to return to the app directory.

The help menu identifies Tuner as part of the ACS Web Apps project, with a link to the app directory.
