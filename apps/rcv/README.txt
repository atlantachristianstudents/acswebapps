Verse Lookup - installable offline app
=======================================
Put this whole folder on any static HTTPS host (GitHub Pages, Netlify, Cloudflare Pages, your own site).
Open the address once while online; the app caches itself. After that it works with no connection.

Install:
  iPhone/iPad (Safari): Share > Add to Home Screen
  Android (Chrome):     menu > Install app
  Windows/Mac/Linux (Chrome or Edge): install icon in the address bar

Your verse text file is chosen once and stored on that device, just like the single-file version.
When you replace index.html with a newer version, change VERSION in sw.js so devices pick it up.

External display (new)
----------------------
With a display connected, Present puts the verses on that screen and turns this device into the control panel.
  - Chrome/Edge (Android, desktop): Display... > Cast or connected display. Needs https. The display page loads on the TV/Chromecast.
  - Any browser: Display... > Open a display window, then drag it to the other screen (iPad Stage Manager, Android desktop mode, computers).
  - iPhone/iPad Safari cannot send a page to a wired or AirPlay display; it only mirrors the whole screen.
Keep display.html in the same folder as index.html. Settings: cog panel > Presenting (Auto / This screen / External display).
