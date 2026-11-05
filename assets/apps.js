/*
 * App registry — add a new app by adding an object to this array.
 *
 *   id:          folder name under /apps/ (e.g. "tuner" -> apps/tuner/)
 *   name:        display name
 *   description: one or two sentences
 *   icon:        emoji shown on the card when the app has no icon image
 *   iconUrl:     optional path to an icon image; without it the home page
 *                falls back to apps/<id>/icons/icon-192.png
 *   tags:        categories used for the filter chips
 *   status:      "live" | "beta" | "soon"   ("soon" cards are not clickable)
 *   url:         optional; defaults to "apps/<id>/"
 */
window.APPS = [
  {
    id: "logostype",
    name: "Logos Type",
    description: "Type the scriptures. No account required; your results stay in this browser.",
    icon: "⌨",
    iconUrl: "apps/logostype/dist/icons/icon.svg",
    tags: ["Study", "Memory"],
    status: "live",
    url: "apps/logostypes"
  },
  {
    id: "memorize",
    name: "Memorize",
    description: "Type a passage from memory on a blank page, then check missing, changed, and extra words. Works offline.",
    icon: "✍️",
    iconUrl: "apps/memorize/icons/icon.svg",
    tags: ["Study", "Memory"],
    status: "beta",
    url: "apps/memorize"
  },
  {
    id: "big-text",
    name: "Big Text",
    description: "Display hymn number or text in full-screen seemlessly.",
    icon: "A",
    tags: ["Worship", "Presentation"],
    status: "live",
    url: "apps/big-text"
  },
  {
    id: "verses",
    name: "Verse Lookup",
    description: "Look up a Bible verse and display it full-screen for projectors and livestreams.",
    icon: "📖",
    tags: ["Worship", "Presentation"],
    status: "live",
    url: "apps/verses"
  },
  {
    id: "tunes",
    name: "Tuner",
    description: "Chromatic instrument tuner using your device microphone. Great for guitars, ukuleles, and vocals.",
    icon: "🎸",
    tags: ["Worship", "Music"],
    status: "live",
    url: "apps/tunes"
  },
  {
    id: "songs",
    name: "Songbook",
    description: "Browse thousands of songs, build set lists, and present lyrics full-screen. Works offline.",
    icon: "🎵",
    iconUrl: "apps/songs/icons/icon.svg",
    tags: ["Worship", "Music", "Presentation"],
    status: "live",
    url: "apps/songs"
  }
];
