# Memorize

Practice recalling a verse, poem, speech, or any other text from memory.

1. Enter your reference text or import a UTF-8 `.txt`, `.text`, or `.md` file, or a `.pdf` with selectable text. There is no app-imposed word or character limit for references, answers, or imported text. PDFs may be up to 10 MB and 100 pages. Import replaces the reference only after validation; review or edit it before beginning, especially PDF spacing, reading order, headers, and page breaks. Markdown is imported as literal text, including formatting characters. Scanned PDFs need OCR first; password-protected PDFs must be unlocked before importing. Word files must first be exported as plain text or PDF. Empty, oversized, and unreadable files leave your current reference intact.
2. Choose whether to ignore capitalization and punctuation, then select **Begin practice**.
3. The reference disappears. Recall uses a blank, full-window text box with no header or instructions. In ordinary practice, small controls at the bottom let you **Check my recall** or **Edit reference**. In Test mode, only a small submission-shortcut reminder remains. Empty submissions are allowed to reveal everything you missed.
4. Review the word comparison: crossed-out words are incorrect or extra; underlined words are expected. Try again starts with a blank answer, or edit the reference to study it again.

Word alignment accounts for missing, added, and substituted words. Accuracy is `max(0, 1 − word edits / reference word count) × 100`, rounded to a whole percent. Spacing and line breaks are always ignored. Capitalization and Unicode punctuation are ignored by default; turn off those options for stricter checking. Punctuation-only tokens are skipped when punctuation is ignored. This is a word comparison, not a meaning-based assessment.

Comparison uses memory proportional to passage length; very long, substantially different passages may take longer to check. Saving very large references depends on the browser’s storage quota.

The reference and comparison settings are saved in localStorage under `adless-memorize-v1` when available. In ordinary practice, answers are only held for the current session and are cleared on retry. Nothing is uploaded. Clear the reference field to remove saved text, or clear the app's site data.

## Import from URL

Paste a complete HTTP or HTTPS address into **Import from a URL** and select **Import URL** (or press Enter in that field). URLs can point to web pages, UTF-8 text/Markdown files, or PDFs with selectable text. For HTML, the app extracts the main/article content when present, removes common navigation and scripts, and preserves paragraph breaks. Review the extracted text before beginning; complex layouts, dynamic pages, or site-specific formatting may need manual cleanup.

The browser fetches the URL directly without cookies or a proxy. The source website receives the request, but your reference and answers are not uploaded. Cross-origin sites must allow CORS; login-protected pages, browser-blocked HTTP links, inaccessible sites, and timeouts show an error and leave your reference intact. If a site blocks access, download its PDF/text file and import it, or paste the text. URL imports require connectivity; the imported reference remains available offline once saved. Imported pages are never inserted into the app or executed. PDF size/page limits also apply to URLs.

## Test mode

On the import/preparation page, select **Test** and set a passcode, then select **Begin test**. The app requests full-screen. During recall, type in the automatically focused answer box and press **Shift + Ctrl / Command + Enter (Ctrl: ⇧⌃↵ · Mac: ⇧⌘↵)** to submit; this reminder stays on screen. Mouse clicks, context menus, clipboard actions, drag/drop, and other page-level shortcuts are blocked. Basic typing, deletion, cursor movement, selection with Shift, and input-method composition remain available. Reference editing, navigation links, and clickable recall actions are hidden. Results appear immediately after submission, with normal keyboard and mouse interaction restored. Enter the passcode on the results page to **Restart test** with a blank answer or **Return to import** to edit or import another reference. Each restart keeps the same passcode and locks the new attempt again. Returning to import exits full-screen.

Test mode saves the locked stage, reference, settings, and answer under `adless-memorize-test-v1` in localStorage. Refreshing restores the recall or results page, and browser Back within the app keeps the test locked. A salted passcode hash is stored, rather than the passcode itself. Test mode needs browser storage and Web Crypto (HTTPS, localhost, or a supporting file:// browser). Keep the passcode safe; there is no in-app passcode reset. Returning to import with the correct passcode removes the test record.

This is a local workflow lock, not a secure proctoring system. Browser and operating-system shortcuts (including escaping full-screen and switching apps) cannot all be intercepted. Full-screen depends on browser support and permission; after a reload or leaving full-screen, a reminder asks for a typing key to request it again. The test stays locked if full-screen is unavailable or denied. Clearing site data, another browser profile, or developer tools can bypass the lock. Ordinary practice continues to work without a passcode and does not persist answers.

## Install and offline use

Open the app on HTTPS or localhost, then use your browser's **Install app** or **Add to Home Screen** option when available. After the service worker finishes caching the first visit, the app works offline. It also runs directly from `index.html` over file:// without service-worker support; storage availability depends on the browser.

All runtime assets are in this folder. PDF importing uses a locally bundled copy of Mozilla PDF.js, including fonts and character maps; no files are uploaded and no CDN or external service is used. The parser loads only when you import a PDF and is cached for offline use. See [vendor/pdfjs/README.md](vendor/pdfjs/README.md) for version and license details. Serve the repository with `python3 -m http.server 8000`, then visit `http://localhost:8000/apps/memorize/`. Bump `VERSION` in `sw.js` whenever cached files change.
