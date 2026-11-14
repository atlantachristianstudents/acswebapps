# Rise

An installable, offline-friendly daily verse app. Each local calendar day selects a verse from the shared Recovery Version text source and remembers the downloaded text in IndexedDB. Add it to the phone’s Home Screen or install it from the browser to open it quickly in its own window.

The app cannot launch itself when a phone wakes, replace the lock screen, or appear ahead of notifications. Open its home-screen icon to see the verse immediately; visit once online first so the Scripture can be cached for offline use.


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
