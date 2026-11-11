# Show Time

A minimal, full-screen timer, clock, and stopwatch (countdown default: 90 seconds) with light, dark, black-on-white, and white-on-black themes. No dependencies, accounts, or network requests beyond the app's own offline files.

- Select the **?** button in the bottom-right corner or press **/** or **?** to toggle keyboard shortcuts. Close the panel or press Escape to return.
- Press **T** or select the mode button to cycle **Timer → Clock → Stopwatch**. Clock shows local time in 24-hour format. The selected mode and stopwatch state are saved in `adless-timer-view`. Switching modes leaves running timers and stopwatches running in the background.
- In stopwatch mode, Enter starts/pauses/resumes; Space starts at zero or resets a paused stopwatch; R resets and restarts a running stopwatch. Reset sessions appear in history. Digits and arrows edit only the countdown. Theme, size, decimals, and fullscreen controls apply in every mode.
- Type digits as minutes and seconds: `130` → **01:30**, `5` → **00:05**. The first digit replaces the previous duration. Backspace corrects input. Seconds above 59 normalize; up to 9999:59 is supported.
- Left/right subtract/add one minute; down/up subtract/add one second. Editing is available while stopped or paused. Editing a paused session records it as changed.
- Press **M** or select the sound button to mute/unmute the completion chime. Sound is on by default, and your choice is remembered. Audio uses Web Audio with no external files.
- Press **D** to cycle 0 → 1 → 2 decimal places (`01:30` through `01:30.00`) for the current mode. Timer, clock, and stopwatch each remember their own precision. Duration entry still uses minutes and whole seconds.
- The Pause button turns alert red while the timer is running.
- Status captions above the action buttons are visually hidden; screen readers still receive status updates.
- The colon stays steady while running, paused, or stopped.
- Enter starts, pauses, or resumes. Space starts an idle/finished timer, resets a paused timer to its original duration without starting it, and does nothing while running. Press **R** while running to reset to the original duration and immediately restart; the interrupted session is recorded as Reset. R does nothing while stopped or paused. Visible buttons also work on touch devices. Standard Enter/Space activation applies when a button has focus.
- Press **H** or select the theme button to cycle light → dark → black on white → white on black. Your choice is saved on this device.
- Press **−/+** to change the timer text size, **F** to toggle fitting it to the available space (press again to restore the previous size), and **Shift+F** to toggle browser full screen. Text size is saved and stays within the viewport when resized.
- The display fills the viewport without a footer or back link. **Full screen** optionally hides browser chrome where supported.
- The history icon in the bottom-left opens saved sessions. Full screen and sound use labeled icon buttons at the top; their icons reflect fullscreen and mute state. History stays out of the way until opened. The latest 100 completed, reset, or changed sessions are stored locally, with completion time and original duration. Select a history duration to reuse it while stopped. Clear history removes saved records.
- Active countdowns use a wall-clock deadline, so they catch up after backgrounding or device sleep. Reloading restores the timer. The browser may suspend execution while closed; completion is recorded on the next visit. A short chime plays on completion when sound is enabled and the browser allows audio. There are no background notifications; suspended/closed browsers cannot guarantee a timely chime, and completions more than five seconds late remain silent.
- Duration, timer state, history, theme, sound, decimal display, and text size (including fill mode) are remembered across reloads on the same browser and device. Browser full screen requires a fresh user action after reopening.
- Data uses `adless-timer-v1`, theme uses `adless-timer-theme`, display size uses `adless-timer-size`, decimal display uses `adless-timer-decimals`, and sound uses `adless-timer-muted` in localStorage. If browser storage is unavailable, the app silently continues with session-only history. Use one tab for a timer; simultaneous tabs do not synchronize.

Open `index.html` directly or serve this folder on any static host. For installation, open over HTTPS or localhost, then use your browser's Install/Add to Home Screen action. After the first online visit, the service worker caches all required files for offline use. Fullscreen and installation availability vary by browser.

Increment `timer-v23` in `sw.js` whenever a cached file changes. Only this app's caches are removed during upgrades; local history survives.

The app icon uses the same presentation-screen shape as Show Words and Show Songs, with a clock face and Show Time’s green palette.
