# Rise

An installable, offline-friendly daily verse app. Each local calendar day selects a verse from the shared Recovery Version text source and remembers the downloaded text in IndexedDB. Add it to the phone’s Home Screen or install it from the browser to open it quickly in its own window.

The app cannot launch itself when a phone wakes, replace the lock screen, or appear ahead of notifications. Open its home-screen icon to see the verse immediately; visit once online first so the Scripture can be cached for offline use. The downloaded text is stored in IndexedDB and only refreshed from the network when the cache is missing or older than 15 days.

For development, a date can be previewed without touching the UI or the system clock, using browser DevTools only: `RiseTestDate.set("2026-11-17")` to preview a date, `RiseTestDate.advance(3)` to preview N days from today (or `advance()` for tomorrow), `RiseTestDate.today()` (or `RiseTestDate.reset()`) to return to the real date, and `RiseTestDate.status()` to show the active one. The override is never persisted and normal operation is unchanged.


Swipe down or press `/` to open settings. Choose a custom daily schedule (multiple references per day can be comma or semicolon separated; use standard names such as `Psalm 23:1` or abbreviations such as `Psa. 23:1`), a daily shuffle, or sequential reading. For shuffle and sequential reading, check multiple books or enter chapter and verse ranges such as `John 3` or `John 3:16-18`; leaving both blank uses the whole Bible. Custom schedules can repeat after the last day. Settings stay on the device, and downloaded Scripture remains available offline.

Book selection and chapter/verse ranges become available after the Scripture download loads. If it cannot load, settings show a connection message; reconnect and reload. Scrolling the settings keeps your unsaved selections.

Settings include book search, a selected-book count, large tappable book labels, and a sticky **Save settings** button. **Clear selection** restores the whole-Bible book pool; any typed ranges still apply. **Close** or Escape dismisses settings without saving.

Saving valid settings returns to the main verse screen immediately. Switching reading modes clears old validation messages and disables inactive reference fields so hidden fields cannot block saving.

Mobile installation uses local 192px and 512px PNG icons with an opaque background and safe padding, plus a 180px Apple touch icon for iOS. If an existing Home Screen shortcut still shows the old icon after updating, remove that shortcut and add Rise to the Home Screen again.

A single custom-schedule line can include verse ranges, multiple books, and shortened references: `John 3:16-18, 20; Romans 8:28`. This shows all five verses on the same day, grouping consecutive verses when they fit. `John 3:16, 17, 18` and `Psalm 23:1, 23:4` also work. Ranges may span chapters, such as `John 3:36-4:2`.

Consecutive verses from the same book share a slide when they fit near the normal reading size. Longer passages split across slides, and separate passages stay separate. Grouping adjusts to screen size and rotation, preserving your current passage. Swipe up or press the up arrow for the next verse; swipe down or press the down arrow for the previous verse. On the first slide, swiping down opens settings. Swipe anywhere on the verse screen to navigate; the screen shows only the current verse and reference, with no navigation buttons or slide indicators. Each slide automatically reduces its text size to keep the verse and reference on one screen, including after rotating the phone. Settings remain scrollable.

Use **Check for updates** in settings to manually download and activate the latest app version. Save settings first; Rise restarts when an upgrade is ready. The button reports when the app is current, offline, or unable to finish. Updates preserve saved settings and the independent Scripture database.

When releasing a Rise update, keep `APP_VERSION` in `index.html` equal to `VERSION` in `sw.js`; the manual updater compares them to detect an upgrade.

Verse changes use a smooth vertical slide and fade in the swipe direction. Rapid repeated gestures are ignored during the transition. Devices with reduced motion enabled switch verses immediately.

Reference matching accepts compact forms such as `Jn3:16`, `Rom8:28`, and `1Cor13:4`, plus unique book-name prefixes. Exact aliases take priority: `jud` means Jude, `jdg` means Judges, and `phm` means Philemon. Ambiguous prefixes need more letters. The same matching works in custom schedules and chapter/verse range settings; shorthand such as `Jn3:16,17-18` keeps the preceding book and chapter.

Settings use a compact viewport layout with always-visible Save and update controls. The book list and custom-schedule editor scroll internally; the settings page itself stays in place. Short landscape screens use two columns.

Pinch-to-zoom is disabled across Rise. Single-finger verse swipes and scrolling inside the settings book list and schedule editor remain available.

Pressing Enter in settings fields does not save or close settings. Enter in the schedule adds a new line; use **Save settings** to save and return to the verse screen. The Save button remains keyboard accessible.

Choose from seven themes in settings: **Dawn**, **Paper**, **Sage**, **Ocean**, **Rose**, **Dusk**, and **Midnight**. Changes preview immediately across the verse screen, settings, and browser theme color. **Save settings** remembers the theme on this device; **Close** or Escape restores the saved theme. Dusk and Midnight use dark native controls. A palette icon beside Close cycles through the seven themes, with the current and next theme named in its accessible label and tooltip.

Phone settings use 44px touch targets, shorter mode labels, safe-area spacing, and narrow-screen layouts. When the on-screen keyboard opens, settings prioritize the active editor and keep Close and Save reachable; the normal controls return when the keyboard closes. Book search retains its results while editing, and the range editor hides the book list temporarily.

Saved daily plans open as an editable monthly calendar in settings. The calendar lists every date and all assigned references, including repeated plans, and marks today. Select a date to edit its verses; date edits override only that date. **Use plan** restores the scheduled references. **Edit plan** switches back to the one-line-per-day editor. **Save settings** saves the plan and date edits; **Close** discards them. Browsing months and changing a date or theme preserves the original plan start date. A changed base plan starts today; dated overrides remain attached to their dates.

Use **Import** and **Export** in the daily-plan toolbar to transfer schedules. JSON exports include the plan, repeat setting, original start date, and date-specific calendar edits. Import also accepts `.txt` files with one day per line (starting today and repeating). Imported references are validated against downloaded Scripture before replacing the draft; invalid files leave the draft intact. Review the imported calendar and choose **Save settings** to keep it, or **Close** to discard it. Exports include current draft edits.

Settings open and close with a short slide and fade independent of keyboard height. Closing no longer rebuilds the settings contents mid-transition; verse gestures pause briefly during the transition, and verse regrouping waits until settings close.

Text fields use consistent rounded borders, a theme-colored caret and selection, and a soft focus ring on mobile. Native text editing and selection handles remain available, with an explicit focus outline in forced-color mode.

In settings, swiping up on the panel closes it just like **Close**, discarding unsaved edits. Swiping down leaves the panel still. The viewport does not bounce behind settings; gestures inside the book list, calendar list, and text editors retain their native scrolling and editing behavior.

Closing settings by **Close**, an upward panel swipe, or Escape asks for confirmation when there are unsaved changes, including themes, imported schedules, books, ranges, and calendar edits. Cancel keeps the current draft; confirming discards it. Merely browsing the calendar does not prompt, and **Save settings** closes directly after validation.

The daily-plan calendar’s **Today** button returns to the current month, selects today’s references, and scrolls today into view without changing the plan or its date edits.

The discard confirmation matches the active theme. **Keep editing** preserves the draft; **Discard changes** closes settings without saving. Escape dismisses the confirmation and keeps editing.

The main verse and reference do not show selection or tap highlights during reading gestures. Selection and editing remain available in settings text fields.

Press `/` to toggle settings, including when a dropdown has focus. Closing this way confirms unsaved changes. The shortcut does not intercept typing in text fields or editors, held-key repeats, composition, or modified keyboard shortcuts.

**Import** opens a theme-matched dialog for choosing a file or pasting a URL. URL imports accept direct HTTP(S) links to Rise JSON exports or plain-text plans; the source must allow browser cross-origin access. Downloads omit credentials and referrers, time out after 20 seconds, and are limited to 1 MB. Invalid or canceled imports leave the draft intact. Imported plans remain drafts until saved.

Every line in a daily plan counts as a day, including blank lines at the beginning, middle, or end. Blank days display only the centered Rise icon; they do not fall back to a random verse. Clearing a calendar date also creates an icon-only day. Blank days are preserved in file/URL imports and JSON exports, including repeating and entirely blank plans. Text files ending in a newline therefore include a final blank day.

The **?** button between the theme icon and Close opens a theme-matched About dialog with a brief description and a relative ACS Web Apps project link. The link opens in a new tab so the current settings draft stays available. **Done** or Escape dismisses the dialog without closing settings.

Settings now open directly to a two-dimensional month grid with weekday headings and each day’s references. The verse-selection dropdown is removed. Tap a date to edit its verses; Import (file or URL), Export, Today, and the line-by-line plan editor remain available. Existing shuffle/sequential preferences continue to supply their dated readings until a daily plan is entered or imported; calendar date overrides apply to those readings too. New installations start with an empty daily plan.
