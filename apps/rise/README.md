# Rise

An installable, offline-friendly daily verse app. Each local calendar day selects verses from one or more independent plans using the shared Recovery Version text source and remembers the downloaded text in IndexedDB. Add it to the phone’s Home Screen or install it from the browser to open it quickly in its own window.

The app cannot launch itself when a phone wakes, replace the lock screen, or appear ahead of notifications. Open its home-screen icon to see the verse immediately; visit once online first so the Scripture can be cached for offline use. The downloaded text is stored in IndexedDB and only refreshed from the network when the cache is missing or older than 15 days.

For development, a date can be previewed without touching the UI or the system clock, using browser DevTools only: `RiseTestDate.set("2026-11-17")` to preview a date, `RiseTestDate.advance(3)` to preview N days from today (or `advance()` for tomorrow), `RiseTestDate.today()` (or `RiseTestDate.reset()`) to return to the real date, and `RiseTestDate.status()` to show the active one. The override is never persisted and normal operation is unchanged.


Swipe down or press `/` to open settings. Rise supports independent Shuffle, Sequential, and Custom plans. Use **＋** to create a plan, choose its type, set its start date (tomorrow by default) and optional end date, then **Save plan**. Each plan saves independently. New plans stay off until enabled in **Edit plans** and included with **Save changes**. Shuffle and Sequential let you set the number of verses per day (default 2), choose books, or enter custom ranges. Custom plans support multiple references per day and can repeat. All settings stay on the device, and downloaded Scripture remains available offline.

The settings calendar previews the plans currently enabled for each date. **Edit plans** opens the plan list. Reorder plans with drag and drop or the up/down buttons; higher rows have higher priority. Toggle plans on or off, edit them, or delete them after confirmation. **Combined** displays verses from every enabled plan in priority order. **Override** displays only the highest enabled plan active that day. Each plan has independent dates, schedule or selection, reading position, and date edits.

Book selection and chapter/verse ranges become available after the Scripture download loads. If it cannot load, settings show a connection message; reconnect and reload. Scrolling the settings keeps your unsaved selections. When no verses are assigned to a day, Rise shows only its centered icon. This includes an empty plan, blank schedule lines, cleared calendar dates, dates before a plan starts, and dates after a non-repeating plan ends.

Plan editors include book search and a selected-book count. **Save plan** saves only that plan. **Save changes** in **Edit plans** saves the ordering, enabled switches, and Combined/Override choice. Creating or editing a plan does not save arrangement changes.

Plan start dates default to tomorrow; an end date is optional. There is no Today/Tomorrow confirmation when saving a plan.

Mobile installation uses local 192px and 512px PNG icons with an opaque background and safe padding, plus a 180px Apple touch icon for iOS. If an existing Home Screen shortcut still shows the old icon after updating, remove that shortcut and add Rise to the Home Screen again.

A single custom-schedule line can include verse ranges, multiple books, and shortened references: `John 3:16-18, 20; Romans 8:28`. This shows all five verses on the same day, grouping consecutive verses when they fit. `John 3:16, 17, 18` and `Psalm 23:1, 23:4` also work. Ranges may span chapters, such as `John 3:36-4:2`.

Consecutive verses from the same book share a slide when they fit near the normal reading size. Longer passages split across slides, and separate passages stay separate. Grouping adjusts to screen size and rotation, preserving your current passage. Swipe up for the next verse; swipe down or press either the up or down arrow key for the previous verse. On the first slide, swiping down or pressing either arrow key opens settings. Swipe anywhere on the verse screen to navigate; the screen shows only the current verse and reference, with no navigation buttons or slide indicators. Each slide automatically reduces its text size to keep the verse and reference on one screen, including after rotating the phone. Settings remain scrollable.

On the first visit, a one-time popup explains that swiping down (or pressing the up/down arrow keys or `/`) opens settings. Confirming with **Got it** dismisses it and records the dismissal in localStorage so it does not reappear on later visits.

Use **Check for updates** in the **?** About dialog to manually download and activate the latest app version. Save plan and arrangement changes first; Rise restarts when an upgrade is ready. The button reports when the app is current, offline, or unable to finish. Updates preserve saved settings and the independent Scripture database.

When releasing an update, keep the `acswebapps-updater` script’s `data-version` equal to `VERSION` in `sw.js`. The repository validator checks this.

Verse changes use a smooth vertical slide and fade in the swipe direction. Rapid repeated gestures are ignored during the transition. Devices with reduced motion enabled switch verses immediately.

Reference matching accepts compact forms such as `Jn3:16`, `Rom8:28`, and `1Cor13:4`, plus unique book-name prefixes. Exact aliases take priority: `jud` means Jude, `jdg` means Judges, and `phm` means Philemon. Ambiguous prefixes need more letters. The same matching works in custom schedules and chapter/verse range settings; shorthand such as `Jn3:16,17-18` keeps the preceding book and chapter.

Settings use a compact viewport layout with an always-visible Save button. The book list and custom-schedule editor scroll internally; the settings page itself stays in place. Short landscape screens use two columns.

Pinch-to-zoom is disabled across Rise. Single-finger verse swipes and scrolling inside the settings book list and schedule editor remain available.

Pressing Enter in settings fields does not save or close settings. Enter in a custom schedule adds a new line. Save controls remain keyboard accessible.

Choose from seven themes in settings: **Dawn**, **Paper**, **Sage**, **Ocean**, **Rose**, **Dusk**, and **Midnight**. The current theme name appears beside the palette button. Changes preview immediately across the verse screen, settings, and browser theme color, and are saved when you cycle the palette. Dusk and Midnight use dark native controls. A palette icon beside Close cycles through the seven themes, with the current and next theme named in its accessible label and tooltip.

Phone settings use 44px touch targets, shorter mode labels, safe-area spacing, and narrow-screen layouts. When the on-screen keyboard opens, settings prioritize the active editor and keep Close and Save reachable; the normal controls return when the keyboard closes. Book search retains its results while editing, and the range editor hides the book list temporarily.

On a computer, a trackpad or mouse-wheel scroll over the verse screen behaves like a phone swipe: scrolling down opens settings from the first slide or moves to the previous verse, and scrolling up moves to the next verse. The verse screen never scrolls behind the gesture.

In the plan editor, pressing Tab adds a new day instead of leaving the field, and a live counter under the textarea shows how many days are planned.

The settings calendar lists planned references for each date and marks today. Open an individual plan and choose **Plan calendar** to edit that plan’s date overrides; **Use plan** restores its scheduled references. Save those edits with **Save plan**.

Use **Import** and **Export** to transfer plans. JSON exports include the plan, repeat setting, dates, and date-specific edits. Import also accepts `.txt` files with one day per line. Imports create an independent plan draft; save it with **Save plan**. Imported references are validated against downloaded Scripture.

Settings open and close with a short slide and fade independent of keyboard height. Closing no longer rebuilds the settings contents mid-transition; verse gestures pause briefly during the transition, and verse regrouping waits until settings close.

Text fields use consistent rounded borders, a theme-colored caret and selection, and a soft focus ring on mobile. Native text editing and selection handles remain available, with an explicit focus outline in forced-color mode.

In settings, swiping up on the panel closes it just like **Close**, discarding unsaved edits. Swiping down leaves the panel still. The viewport does not bounce behind settings; gestures inside the book list, calendar list, and text editors retain their native scrolling and editing behavior.

Closing settings by **Close**, an upward panel swipe, or Escape asks for confirmation when a plan draft or arrangement has unsaved changes. Cancel keeps the current screen; confirming closes it. Browsing the calendar does not prompt.

The plan calendar’s **Today** button returns to the current month, selects today’s references, and scrolls today into view.

The discard confirmation matches the active theme. **Keep editing** preserves the draft; **Discard changes** closes settings without saving. Escape dismisses the confirmation and keeps editing.

The main verse and reference do not show selection or tap highlights during reading gestures. Selection and editing remain available in settings text fields.

Press `/` to toggle settings, including when a dropdown has focus. You can also press <kbd>/</kbd> or the up or down arrow keys to open settings. The shortcut does not intercept typing in text fields or editors, held-key repeats, composition, or modified keyboard shortcuts.

**Import** opens a theme-matched dialog for choosing a file or pasting a URL. URL imports accept direct HTTP(S) links to Rise JSON exports or plain-text plans; the source must allow browser cross-origin access. Downloads omit credentials and referrers, time out after 20 seconds, and are limited to 1 MB. Invalid or canceled imports leave the current plan intact. Imports create a new plan draft; **Save plan** stores it independently, and it remains off until the arrangement is saved.

Every line in a daily plan counts as a day, including blank lines at the beginning, middle, or end. Blank days display only the centered Rise icon; they do not fall back to a random verse. Clearing a calendar date also creates an icon-only day. Blank days are preserved in file/URL imports and JSON exports, including repeating and entirely blank plans. Text files ending in a newline therefore include a final blank day.

The **?** button that opened the About dialog between the theme icon and **Close** was removed; the About content is no longer shown on the first screen.

The calendar is a read-only overview of the enabled plan arrangement. Edit date overrides from an individual plan’s **Plan calendar**.

Settings no longer have a **?** About button; the main verse screen has no About button.

Browser pinch-to-zoom is disabled. Single-finger scrolling, input editing, and the app’s own controls remain available.

**Check for updates** is available inside the app’s **?** help or About panel. Save your work first; the app checks for a newer version, downloads and activates it, and restarts when needed. Status messages cover offline use, failures, and an already-current app. Downloaded content in IndexedDB is preserved.

The **＋** button opens the Shuffle, Sequential, and Custom plan editor. Sequential plans retain their own Bible jump, date, reset controls, and reading position. The **Edit plans** screen controls priority and which plans are active.

New plans begin tomorrow by default, and each can have an optional end date. Plans outside their date range do not contribute verses.

**Sequential** and **Shuffle** share the same book search, selection table, and Custom range dialog. Rows show full book names; search accepts full names, abbreviations, and compact numbered names (for example `Genesis`, `Gen`, `1 Corinthians`, or `1Cor`). Sequential reads the selected verses in Bible order. Changing its selection previews the first selected verse; its start date controls when it becomes active. Its jump/date/reset controls remain under **Reading position**. Unsaved selections do not affect the displayed day after closing settings.

In Shuffle and Sequential, **Custom range** opens a theme-matched dialog for entering chapters or verses. Its **Save** button validates the range and applies it to the settings draft; Cancel or Escape leaves the previous range unchanged. Saving an empty range clears it. The current range appears below the button. Use **Save plan** to save the individual plan. Ranges can combine references with commas or semicolons and use a hyphen across verses, chapters, or books (for example, `John 3:16-Romans 8:2`). A range that ends in an earlier book continues through Revelation and wraps to Genesis.

Empty days display only the centered Rise rays, without a surrounding circle or background tile. The symbol follows the current theme’s accent color and is available offline.

The About dialog places **Done** beside the **About Rise** heading at the top.
