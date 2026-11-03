# PDF.js for Memorize

Mozilla PDF.js **6.5.438**, from the official `pdfjs-dist` distribution:
https://registry.npmjs.org/pdfjs-dist/-/pdfjs-dist-6.5.438.tgz

Source: https://github.com/mozilla/pdf.js

PDF.js is licensed under Apache-2.0 (see LICENSE). Font and character-map licenses are preserved in `standard_fonts-LICENSE_*` and `cmaps-LICENSE`.

This approved local dependency supports private, offline text extraction. No package manager or build step is needed to run the app.

The legacy minified `pdf.min.mjs` and `pdf.worker.min.mjs` distributions are adapted as classic scripts so importing also works from file://. Each is wrapped in a strict IIFE, its final ES module export and source-map comment removed, and `import.meta.url` replaced by the captured `document.currentScript.src`. The upstream globals `pdfjsLib` and `pdfjsWorker` are preserved. Loading the worker script first selects PDF.js's main-thread worker fallback, avoiding module-worker restrictions on local files. WebAssembly and eval are disabled for extraction.

`resources.js` contains the distribution's `.bcmap`, `.pfb`, and `.ttf` files as a base64 filename map. The app's `BinaryDataFactory` decodes these locally so fonts and CMaps require no fetch requests, including on file://. Rendering assets, OCR, and the PDF viewer are not included.

When updating, keep both parser files and resources at the same release, preserve the licenses, repeat these adaptations, check PDF imports over HTTP and file://, and bump the app's service-worker version.
