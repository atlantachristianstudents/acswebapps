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
 *   url:         optional; defaults to "apps/<id>/"; may point to a site redirect or external app
 */
window.APPS = [
  {
    id: "bible-connections",
    name: "Bible Connections",
    description: "Explore Bible cross-references in an interactive map. Trace connections between chapters and verses, entirely offline.",
    icon: "🌈",
    iconUrl: "apps/bible-connections/icons/icon.svg",
    tags: ["Study", "Tools"],
    status: "live"
  },
  {
    id: "timer",
    name: "Show Time",
    description: "A minimal full-screen timer, clock, and stopwatch. Use keyboard controls and keep a private session history.",
    icon: "◷",
    iconUrl: "apps/timer/icons/icon.svg",
    tags: ["Presentation"],
    status: "live"
  },
  {
    id: "bible-translation-explorer",
    name: "Bible Translation Explorer",
    description: "Compare 11 Bible translations with adjustable literalness and readability weights. Export scores and charts offline.",
    icon: "📊",
    iconUrl: "apps/bible-translation-explorer/icons/icon.svg",
    tags: ["Study", "Tools"],
    status: "beta"
  },
  {
    id: "logostype",
    name: "Logos Type",
    description: "Type the Scriptures and read what you typed. Practice on your own or race against friends.",
    icon: "⌨",
    iconUrl: "apps/logostype/icons/icon.png",
    tags: ["Study", "Memory"],
    status: "live",
    url: "apps/logostype/"
  },
  {
    id: "memorize",
    name: "Memorize",
    description: "Memorize Bible verses (Recovery Version) or any passage: hide words or type from memory and check missing, changed, and extra words. Works offline.",
    icon: "✍️",
    iconUrl: "apps/memorize/icons/icon.svg",
    tags: ["Study", "Memory"],
    status: "beta",
    url: "apps/memorize"
  },
  {
    id: "verse-review",
    name: "Verse Review",
    description: "Practice Bible verses with spaced reviews. Add your own text, recall it, and schedule the next session. Private and offline-friendly.",
    icon: "🧠",
    iconUrl: "apps/verse-review/icons/icon.svg",
    tags: ["Study", "Memory"],
    status: "beta",
    url: "apps/verse-review"
  },
  {
    id: "big-text",
    name: "Show Songs",
    description: "Display hymn number or text in full-screen seemlessly.",
    icon: "🎵",
    iconUrl: "apps/show-songs/icons/icon.svg",
    tags: ["Worship", "Presentation"],
    status: "live",
    url: "apps/show-songs"
  },
  {
    id: "verses",
    name: "Show Words",
    description: "Look up a Bible verse and display it full-screen for projectors and livestreams.",
    icon: "▤",
    iconUrl: "apps/show-words/icons/icon.svg",
    tags: ["Worship", "Presentation"],
    status: "live",
    url: "apps/show-words"
  },
  {
    id: "tunes",
    name: "Tune",
    description: "Chromatic instrument tuner using your device microphone. Great for guitars, ukuleles, and vocals.",
    icon: "🎸",
    iconUrl: "apps/tune/icons/icon.svg",
    tags: ["Worship", "Music"],
    status: "live",
    url: "apps/tune/"
  },
  {
    id: "verse-designer",
    name: "Verse Designer",
    description: "Design beautiful Bible verse wallpapers and shareable images with custom typography and gradients. Export as PNG, offline.",
    icon: "❝",
    iconUrl: "apps/verse-designer/icons/icon.svg",
    tags: ["Tools", "Worship", "Memory"],
    status: "beta"
  },
  {
    id: "songs",
    name: "Songbook",
    description: "Browse thousands of songs, build set lists, and present lyrics full-screen. Works offline.",
    icon: "🎵",
    iconUrl: "apps/songs/icons/icon.svg",
    tags: ["Worship", "Music", "Presentation"],
    status: "beta",
    url: "apps/songs"
  }
];
