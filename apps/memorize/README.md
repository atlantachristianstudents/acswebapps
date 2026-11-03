# Memorize

Practice recalling a verse, poem, speech, or any other text from memory.

1. Enter your reference text or import a UTF-8 `.txt`, `.text`, or `.md` file (up to 1,000 whitespace-separated words and 20,000 characters). Import replaces the reference only after validation; review or edit it before beginning. Markdown is imported as literal text, including formatting characters. PDF and Word files must first be exported as plain text. Empty, oversized, and unreadable files leave your current reference intact.
2. Choose whether to ignore capitalization and punctuation, then select **Begin practice**.
3. The reference disappears. Type on the blank page and select **Check my recall**. Empty submissions are allowed to reveal everything you missed.
4. Review the word comparison: crossed-out words are incorrect or extra; underlined words are expected. Try again starts with a blank answer, or edit the reference to study it again.

Word alignment accounts for missing, added, and substituted words. Accuracy is `max(0, 1 − word edits / reference word count) × 100`, rounded to a whole percent. Spacing and line breaks are always ignored. Capitalization and Unicode punctuation are ignored by default; turn off those options for stricter checking. Punctuation-only tokens are skipped when punctuation is ignored. This is a word comparison, not a meaning-based assessment.

The reference and comparison settings are saved in localStorage under `adless-memorize-v1` when available. Answers are only held for the current session and are cleared on retry. Nothing is uploaded. Clear the reference field to remove saved text, or clear the app's site data.

## Install and offline use

Open the app on HTTPS or localhost, then use your browser's **Install app** or **Add to Home Screen** option when available. After the service worker finishes caching the first visit, the app works offline. It also runs directly from `index.html` over file:// without service-worker support; storage availability depends on the browser.

All runtime assets are in this folder. No libraries or external services are required. Serve the repository with `python3 -m http.server 8000`, then visit `http://localhost:8000/apps/memorize/`. Bump `VERSION` in `sw.js` whenever cached files change.
