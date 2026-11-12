# Verse Review

An offline-friendly spaced review tool for Bible verses. Enter a reference and leave the text blank to fetch it, or enter your own text. A chapter reference adds each verse as its own review card. The available public domain translations are KJV, ASV, and WEB; your selected lookup default is saved in this browser. Entered text is labeled “Custom text.” Select verses with Command/Ctrl-click to toggle them or Shift-click and Shift+Arrow to select a range, then delete the selection in one confirmed action. Use Undo and Redo to reverse verse additions and deletions during the current session. Rate each recall as Again, Hard, Good, or Easy to schedule the next review.

Verses and review schedules are stored in this browser's local storage and are not synced or backed up. Clearing browser data removes them. Lookups use the [no-key Midvash Bible API](https://github.com/midvash/bible-api) and require an internet connection. Its [public domain dataset](https://github.com/midvash/bible-data) lists KJV, ASV, and WEB as public domain. KJV, ASV, and WEB are redistributable public domain English translations; attribution returned by the API is shown with fetched text. The app continues to work offline for verses already saved.

Open `index.html` or host this folder on a static server. Service worker caching is enabled on HTTP(S) hosts; local storage also works when opened as a file.

Navigation: find **← Adless** inside the **?** help menu at the bottom right to return to the app directory.
