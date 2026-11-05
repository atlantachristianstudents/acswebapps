# Logostype

Open `dist/index.html` directly in your browser to type Scripture and use Scripture Journey. No server, installation, or build is required. Keep the entire `dist` folder together; its scripts and icons use relative paths.

Names, typing history, journey progress, and past completion dates are saved in this browser. Browser support for storage at `file://` URLs varies; use settings to export a backup before moving the folder or switching browsers.

Scripture is loaded from the bundled classic script `dist/scripture-text.js`, without fetching a text file. If editing the Scripture text, keep that script's `scriptureText` string in sync with `dist/RcV.txt`.

The same folder can also be hosted as a static website. Installable PWA and service worker caching require HTTPS or localhost; direct file use skips service worker registration. Race rooms require an internet connection.
