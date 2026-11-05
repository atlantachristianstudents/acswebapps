# Logostype

Open `dist/index.html` directly in your browser to type Scripture and use Scripture Journey. No server, installation, or build is required. Keep the entire `dist` folder together; its scripts and icons use relative paths.

Under Scripture Journey, choose **entire Scriptures** or **book**, then select any of the 66 books. Each book saves its own verse progress and completion dates, independently of the entire Scriptures journey. The book selector follows your chosen theme, including its dropdown colors and keyboard focus highlight. Switching books resumes where you left off. Book journeys stop at the final verse; restart starts that book again and preserves its past completion dates. Progress and completion dates for every book are included in backups.

Each completed Scripture Journey verse saves its WPM and verse reference in typing history, including backups. The timer starts with the first typed character. Deleting all text resets the timer and attempt statistics; typing again starts a fresh attempt. Reading time before typing a verse is excluded. Verse results are kept when restarting a journey.

Scripture Journey also shows cumulative **time spent typing (successful attempts)** and **total attempts** for the selected book or entire Scriptures. An attempt counts when its first character is typed, including attempts later cleared, restarted, switched away from, or abandoned. Time is added only when a verse is completed correctly, measured from the first character through completion (including pauses and corrections). Totals persist across reloads and journey restarts and are included in backups; repeated imports do not duplicate attempts. These totals begin with attempts made after this feature was added; older verse results do not contain timing data.

Names, typing history, journey progress, and past completion dates are saved in this browser. Browser support for storage at `file://` URLs varies; use settings to export a backup before moving the folder or switching browsers.

When a space is expected, other characters appear as red extra letters after the preceding word. The typing position stays at that space until you type a space. Backspace removes the extra letters; Scripture Journey and races require removing all extras before completion.

Arrow keys are disabled in the typing field to prevent cursor movement during tests. Backspace still corrects mistakes.

Time, word-count, and quote test results list the Scripture references reached beneath the WPM graph. Each verse is labeled fully or partially typed based on how much of the verse was covered, including verses cut short by the word limit. These labels describe coverage; accuracy is reported separately. Custom text and friend races do not show inferred verse references.

Friend races require correcting all characters, or end at the time limit. Input stops at the passage length, and any remaining corrections are counted beside the timer. Once you finish, the room waits for the other racers; completion updates repeat until the host confirms the round is over.

When every other connected racer has finished, the last unfinished racer can choose **give up** to end the round. The standings label that racer “gave up” and place them after finishers. The room stays open for a rematch.

Scripture is loaded from the bundled classic script `dist/scripture-text.js`, without fetching a text file. If editing the Scripture text, keep that script's `scriptureText` string in sync with `dist/RcV.txt`.

The same folder can also be hosted as a static website. Installable PWA and service worker caching require HTTPS or localhost; direct file use skips service worker registration. Race rooms require an internet connection.
