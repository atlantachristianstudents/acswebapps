# Logostype

Open `index.html` directly in your browser to type Scripture and use Scripture Journey. No server, installation, or build is required. Keep this entire app folder together; its scripts and icons use relative paths.

Under Scripture Journey, open the journey picker and choose **entire Scriptures** or any of the 66 books directly from the popup grid. Each book saves its own verse progress and completion dates, independently of the entire Scriptures journey. The journey picker follows your chosen theme, colors Old Testament books blue and New Testament books purple with a legend, and highlights the current selection and keyboard focus. Switching books resumes where you left off. Book journeys stop at the final verse; restart starts that book again and preserves its past completion dates. Progress and completion dates for every book are included in backups.

Each completed Scripture Journey verse saves its WPM and verse reference in typing history, including backups. Leading spaces at the start of a Scripture Journey verse are ignored without starting the timer or counting mistakes. The timer starts with the first non-space character. Deleting all text resets the timer and attempt statistics; typing again starts a fresh attempt. Reading time before typing a verse is excluded. Verse results are kept when restarting a journey.

After the selected book or entire Scriptures journey is completed, Scripture Journey shows cumulative **time spent typing (successful attempts)** and **total time spent (all attempts)** for that journey. Time stats stay hidden while a journey is in progress, including after restarting it. Time runs from the first character, including pauses and corrections. Total time includes attempts later cleared, restarted, switched away from, or abandoned; successful time includes only correctly completed verses. Time is saved every second and when leaving or resetting an attempt. Totals persist across reloads and journey restarts and are included in backups; repeated imports do not duplicate time. Existing successful attempt times are retained, but time for previously abandoned attempts cannot be recovered. Older verse results without timing data are excluded.

Names, typing history, journey progress, and past completion dates are saved in this browser. Browser support for storage at `file://` URLs varies; use settings to export a backup before moving the folder or switching browsers.

A mistyped character — letter or space — shows the character you actually typed in red in place of the pressed key, while the cursor moves on; correct it with backspace. Scripture Journey and races require every character to match before completion.

Outside the typing field, use Tab / Shift+Tab or the arrow keys to move between visible controls. Left/right follow the Tab order; up/down move between visual rows, including the book picker. Open dialogs keep arrow navigation inside the dialog. Form fields and the reading region retain their normal arrow-key behavior. Arrow keys are disabled in the typing field to prevent cursor movement during tests. Backspace still corrects mistakes.

Use **1 / 2 / 3 / 4** to open **Scripture Journey / Reading / Typing Test / Race Friends**, and **`\`** to open settings, in typing or reading mode. No modifier key is needed. These shortcuts are disabled in custom typing tests, open dialogs, and other form fields so you can enter those characters normally.

Typing Test results show speed, accuracy, and the chart, without a Scripture reference list. Scripture Journey keeps verse references in its context and saved history.

Friend races require correcting all characters, or end at the time limit. Input stops at the passage length, and any remaining corrections are counted beside the timer. Once you finish, the room waits for the other racers; completion updates repeat until the host confirms the round is over.

When every other connected racer has finished, the last unfinished racer can choose **give up** to end the round. The standings label that racer “gave up” and place them after finishers. The room stays open for a rematch.

Scripture is downloaded by the shared classic script `scripture-text.js` from the configured Scripture API, then cached in IndexedDB with a localStorage backup for 15 days. Typing and reading use the same loader, strip embedded verse-reference prefixes such as `Gen. 2:1` from downloaded or cached text, and validate the verse count against `scripture-references.js`. Separate verse labels remain visible in Scripture Journey and reading. First use and cache refresh require an internet connection; a fresh cached copy works offline.

The same folder can also be hosted as a static website. Installable PWA and service worker caching require HTTPS or localhost; direct file use skips service worker registration. Race rooms require an internet connection.

Click any typing history entry to view its saved speed chart, including average, instant, and raw WPM and mistakes. Move over the chart to inspect samples. New typing tests and completed Scripture Journey verses save chart data, which is included in backups. Older entries show their result summary with a message when chart data is unavailable. Opening history leaves the current test in place.

Choose the **glasses icon** beside Scripture Journey in the main menu to open reading mode within the app with a grid of **entire Scriptures** and all 66 books. Only choices with at least one completed verse are enabled. A book unlocks through its own journey or through progress in the entire Scriptures journey; its reader shows the furthest completed portion from either. Entire Scriptures uses its own journey progress. Reading mode is available from any typing mode. Read the original Scripture text chapter by chapter, using previous/next or the chapter selector. Only verses completed in the current journey are shown, including the completed portion of an unfinished chapter. Restarting a journey resets its reading progress; book reading remains available if the other journey still covers it. **Back to typing** returns to Scripture Journey at your saved verse progress. Entering reading clears unfinished typed text and stops the typing timer.

Name-save messages appear directly below the **save name** button. The settings cog at the right edge of the header contains your profile name, records and typing history, appearance settings, and data backups. Select **records and typing history** there to browse results and saved charts.

Personal records list the fastest saved WPM for a verse (verse tests and completed Scripture Journey verses), each preset time (15, 30, 60, 120 seconds), and each preset word count (10, 25, 50, 100 words). Categories without a result show a dash. Select a record to open that result and its saved chart. Records update from local and imported history.

Scripture Journey stacks the current chapter and current book progress bars in the left sidebar above the overall word-progress bar, with completed verses for the chapter and completed chapters for the book, plus percentages. A chapter counts toward book progress only once all its verses are completed. They follow the current verse, start at zero when entering a new chapter or book, and remain full when the selected journey is complete. These appear alongside the overall journey progress in both entire Scriptures and individual book journeys.

Confetti celebrates each completed chapter and book in Scripture Journey, including the entire Scriptures journey. Chapter completions use one confetti color, book completions use three, and completing the entire Scriptures journey uses seven. Overlapping milestones trigger only the highest celebration. Confetti respects the device’s reduced-motion preference.

The Scripture Journey controls use fixed top spacing so the journey selector stays in place as verse lengths change.

The left Scripture Journey bar tracks completed words as a share of all words in the selected journey. It shows word and book counts, with word details still available on hover or keyboard focus. Words count once their verse is completed.

**Read the scriptures you typed** is an in-app view rendered by `reading.js`, between Scripture Journey and Typing Test. It shares live progress, theme, settings, and the existing Scripture loader without reloading the page. `index.html#reading` opens reading directly; old `reading.html` links redirect there. Reading assets are cached for offline use.

Reading keeps the main menu: Scripture Journey, the highlighted glasses icon, typing, races, and the right-aligned settings cog. Menu buttons switch views in place.

In reading mode, **N/P** move to the next/previous completed chapter and **Shift+N/Shift+P** move to the next/previous available book. Entire Scriptures stays within its completed portion; individual book views skip locked books. Shortcuts leave inputs and chapter selectors to their normal keyboard behavior.

Under settings → **your data**, choose the alert-colored **clear saved data** button and confirm in the theme-matched dialog to delete this browser’s Logostype name, theme, history and records, journey progress, completions, and typing-time totals. Export a backup first to keep a copy. Other apps’ browser data and downloaded backups are left intact. Leave any active race room before clearing data.

Opening reading mode or switching between its grid and book views starts at the top without focus scrolling the menu out of view. The header uses the same desktop and mobile spacing and fonts as the typing page. The app reserves scrollbar space to keep the menu in place when switching modes.

Scripture Journey opens by default. The Typing Test menu icon opens timed/word/verse/custom tests; the Logostype brand returns to Scripture Journey. Links to `index.html#typing` open Typing Test directly.

The app files live directly in `apps/logostype/`, matching the other Adless apps. The `dist/` folder contains only compatibility pages and a worker that forward old hosted URLs and installed copies to the new location; it is not a build directory. Hosted progress stays on the same origin. For direct `file://` use, export a backup before moving an existing copy, then import it at the new location because browsers may isolate storage by file path.

Scripture Journey highlights the current verse reference above the typing area, with the correction hint beneath it. The status line omits completed-verse and completed-journey counts; progress stays in the sidebar and completion history stays in records.

Choose **typeracer** under settings → **change theme** for a TypeRacer-inspired light gray background, white panels, blue accents, and sans-serif text. Typing uses black passage text, green correct letters, and red error highlighting. The choice is saved on this device and applies to reading mode too; no external fonts or styles are required.

The default theme is **black on white**, with a white background, black text and accents, and gray secondary controls. Choose it under settings → **change theme**. Saved theme choices continue to apply on both typing and reading modes.

Choose **white on black** under settings → **change theme** for a black background, white text and accents, and gray secondary controls. The choice is saved and applies to both typing and reading modes.

In settings, **smaller font** and **bigger font** adjust the typing passage by 2 pixels per click, from 16 to 64 pixels. The size applies for the current page session.

Typing tests show at least three lines at every font size. Scripture Journey expands to show the entire current verse without an internal scrollbar, including at the largest font size. Long words wrap to fit narrow screens.

Settings includes a **keyboard shortcuts** reference for menus, settings, commands, restarting, control navigation, and reading chapters and books, with notes explaining when shortcuts are disabled.

New typing history entries include the local date and time of completion, shown in both the history list and result details and preserved in backups. Older entries retain their original date; their time of day was not recorded.

After finishing a typing test, press **Tab** to focus **Next test**, then **Enter** to begin the next test. Further Tab presses follow the normal control order.
