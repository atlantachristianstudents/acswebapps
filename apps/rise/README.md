# Rise

An installable, offline-friendly daily verse app. Each local calendar day selects a verse from the shared Recovery Version text source and remembers the downloaded text in IndexedDB. Add it to the phone’s Home Screen or install it from the browser to open it quickly in its own window.

The app cannot launch itself when a phone wakes, replace the lock screen, or appear ahead of notifications. Open its home-screen icon to see the verse immediately; visit once online first so the Scripture can be cached for offline use.


Swipe down or press `/` to open settings. Choose a custom daily schedule (multiple references per day can be comma or semicolon separated; use standard names such as `Psalm 23:1` or abbreviations such as `Psa. 23:1`), a daily shuffle, or sequential reading. For shuffle and sequential reading, check multiple books or enter chapter and verse ranges such as `John 3` or `John 3:16-18`; leaving both blank uses the whole Bible. Custom schedules can repeat after the last day. Settings stay on the device, and downloaded Scripture remains available offline.

Book selection and chapter/verse ranges become available after the Scripture download loads. If it cannot load, settings show a connection message; reconnect and reload. Scrolling the settings keeps your unsaved selections.

Settings include book search, a selected-book count, large tappable book labels, and a sticky **Save settings** button. **Clear selection** restores the whole-Bible book pool; any typed ranges still apply. **Close** or Escape dismisses settings without saving.

Saving valid settings returns to the main verse screen immediately. Switching reading modes clears old validation messages and disables inactive reference fields so hidden fields cannot block saving.

Mobile installation uses local 192px and 512px PNG icons with an opaque background and safe padding, plus a 180px Apple touch icon for iOS. If an existing Home Screen shortcut still shows the old icon after updating, remove that shortcut and add Rise to the Home Screen again.
