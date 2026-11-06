# Logostype

Open `index.html` directly in your browser to type Scripture and use Scripture Journey. No server, installation, or build is required. Keep this entire app folder together; its scripts and icons use relative paths.

Under Scripture Journey, open the journey picker and choose **entire Scriptures** or any of the 66 books directly from the popup grid. Each book saves its own verse progress and completion dates, independently of the entire Scriptures journey. The journey picker follows your chosen theme, colors Old Testament books blue and New Testament books purple with a legend, and highlights the current selection and keyboard focus. Switching books resumes where you left off. Book journeys stop at the final verse; restart starts that book again and preserves its past completion dates. Progress and completion dates for every book are included in backups.

Each completed Scripture Journey verse saves its WPM and verse reference in typing history, including backups. Leading spaces at the start of a Scripture Journey verse are ignored without starting the timer or counting mistakes. The timer starts with the first non-space character. Deleting all text resets the timer and attempt statistics; typing again starts a fresh attempt. Reading time before typing a verse is excluded. Verse results are kept when restarting a journey.

After the selected book or entire Scriptures journey is completed, Scripture Journey shows cumulative **time spent typing (successful attempts)** and **total time spent (all attempts)** for that journey. Time stats stay hidden while a journey is in progress, including after restarting it. Time runs from the first character, including pauses and corrections. Total time includes attempts later cleared, restarted, switched away from, or abandoned; successful time includes only correctly completed verses. Time is saved every second and when leaving or resetting an attempt. Totals persist across reloads and journey restarts and are included in backups; repeated imports do not duplicate time. Existing successful attempt times are retained, but time for previously abandoned attempts cannot be recovered. Older verse results without timing data are excluded.

Names, typing history, journey progress, and past completion dates are saved in this browser. Browser support for storage at `file://` URLs varies; use settings to export a backup before moving the folder or switching browsers.

When a space is expected, other characters appear as red extra letters after the preceding word. The typing position stays at that space until you type a space. Backspace removes the extra letters; Scripture Journey and races require removing all extras before completion.

Arrow keys are disabled in the typing field to prevent cursor movement during tests. Backspace still corrects mistakes.

Typing Test results show speed, accuracy, and the chart, without a Scripture reference list. Scripture Journey keeps verse references in its context and saved history.

Friend races require correcting all characters, or end at the time limit. Input stops at the passage length, and any remaining corrections are counted beside the timer. Once you finish, the room waits for the other racers; completion updates repeat until the host confirms the round is over.

When every other connected racer has finished, the last unfinished racer can choose **give up** to end the round. The standings label that racer “gave up” and place them after finishers. The room stays open for a rematch.

Scripture is downloaded by the shared classic script `scripture-text.js` from the configured Scripture API, then cached in IndexedDB with a localStorage backup for 15 days. Typing and reading use the same loader, strip embedded verse-reference prefixes such as `Gen. 2:1` from downloaded or cached text, and validate the verse count against `scripture-references.js`. Separate verse labels remain visible in Scripture Journey and reading. First use and cache refresh require an internet connection; a fresh cached copy works offline. `RcV.txt` remains a local reference file.

The same folder can also be hosted as a static website. Installable PWA and service worker caching require HTTPS or localhost; direct file use skips service worker registration. Race rooms require an internet connection.

Click any typing history entry to view its saved speed chart, including average, instant, and raw WPM and mistakes. Move over the chart to inspect samples. New typing tests and completed Scripture Journey verses save chart data, which is included in backups. Older entries show their result summary with a message when chart data is unavailable. Opening history leaves the current test in place.

Choose the **glasses icon** beside Scripture Journey in the main menu to open the dedicated reading page with a grid of **entire Scriptures** and all 66 books. Only choices with at least one completed verse are enabled. A book unlocks through its own journey or through progress in the entire Scriptures journey; its reader shows the furthest completed portion from either. Entire Scriptures uses its own journey progress. Reading mode is available from any typing mode. Read the original Scripture text chapter by chapter, using previous/next or the chapter selector. Only verses completed in the current journey are shown, including the completed portion of an unfinished chapter. Restarting a journey resets its reading progress; book reading remains available if the other journey still covers it. **Back to typing** returns to the typing page at your saved verse progress. Leaving the typing page clears unfinished typed text.

Name-save messages appear directly below the **save name** button. The settings cog at the right edge of the header contains your profile name, records and typing history, appearance settings, and data backups. Select **records and typing history** there to browse results and saved charts.

Personal records list the fastest saved WPM for a verse (verse tests and completed Scripture Journey verses), each preset time (15, 30, 60, 120 seconds), and each preset word count (10, 25, 50, 100 words). Categories without a result show a dash. Select a record to open that result and its saved chart. Records update from local and imported history.

Scripture Journey stacks the current chapter and current book progress bars in the left sidebar above the overall word-progress bar, with completed verses for the chapter and completed chapters for the book, plus percentages. A chapter counts toward book progress only once all its verses are completed. They follow the current verse, start at zero when entering a new chapter or book, and remain full when the selected journey is complete. These appear alongside the overall journey progress in both entire Scriptures and individual book journeys.

Confetti celebrates each completed chapter and book in Scripture Journey, including the entire Scriptures journey. Chapter completions use one confetti color, book completions use three, and completing the entire Scriptures journey uses seven. Overlapping milestones trigger only the highest celebration. Confetti respects the device’s reduced-motion preference.

The Scripture Journey controls use fixed top spacing so the journey selector stays in place as verse lengths change.

The left Scripture Journey bar tracks completed words as a share of all words in the selected journey. It shows word and book counts, with word details still available on hover or keyboard focus. Words count once their verse is completed.

**Read the scriptures you typed** lives at `reading.html` with its own `reading.js`. Its book grid and chapter views stay on that page; book choices have links that can be bookmarked and support browser back/forward. Both files are cached for offline reading.

The reading page keeps the main menu: Scripture Journey, the highlighted glasses icon, typing, races, and the right-aligned settings cog. Menu links return directly to the selected section of the typing app.

On the reading page, **N/P** move to the next/previous completed chapter and **Shift+N/Shift+P** move to the next/previous available book. Entire Scriptures stays within its completed portion; individual book views skip locked books. Shortcuts leave inputs and chapter selectors to their normal keyboard behavior.

Under settings → **your data**, choose the alert-colored **clear saved data** button and confirm in the theme-matched dialog to delete this browser’s Logostype name, theme, history and records, journey progress, completions, and typing-time totals. Export a backup first to keep a copy. Other apps’ browser data and downloaded backups are left intact. Leave any active race room before clearing data.

Opening the reading page or switching between its grid and book views starts at the top without focus scrolling the menu out of view. The header uses the same desktop and mobile spacing as the typing page.

Scripture Journey opens by default. The Typing Test menu icon opens timed/word/verse/custom tests; the Logostype brand returns to Scripture Journey. Links to `index.html#typing` open Typing Test directly.

The app files live directly in `apps/logostype/`, matching the other Adless apps. The `dist/` folder contains only compatibility pages and a worker that forward old hosted URLs and installed copies to the new location; it is not a build directory. Hosted progress stays on the same origin. For direct `file://` use, export a backup before moving an existing copy, then import it at the new location because browsers may isolate storage by file path.

Scripture Journey highlights the current verse reference above the typing area, with the correction hint beneath it. The status line omits completed-verse and completed-journey counts; progress stays in the sidebar and completion history stays in records.
