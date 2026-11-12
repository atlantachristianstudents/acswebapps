const $ = (s) => document.querySelector(s);
function escapeHtml(value) {
  return String(value).replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );
}
let scriptureLines = [],
  scriptureWordTotals = [0];
function normalizeScripture(line) {
  if (mode !== "book" && !punctuation) line = line.replace(/\p{P}/gu, "");
  if (mode !== "book" && !capitalization) line = line.toLowerCase();
  return line.replace(/\s+/g, " ").trim();
}
const scriptureChapterEnds = [],
  scriptureBookEnds = [];
for (let index = 0; index < scriptureReferences.length; index++) {
  const reference = scriptureReferences[index],
    next = scriptureReferences[index + 1];
  if (!next || reference.slice(0, reference.lastIndexOf(":")) !== next.slice(0, next.lastIndexOf(":")))
    scriptureChapterEnds.push(index + 1);
  if (!next || reference.replace(/ \d+:\d+$/, "") !== next.replace(/ \d+:\d+$/, "")) scriptureBookEnds.push(index + 1);
}
let bookProgress = 0,
  lastTypingMode = "time";
let journeyCompletedAt = null;
try {
  const saved = localStorage.getItem("logostype-journey-completed-at");
  if (saved && Number.isFinite(Date.parse(saved))) journeyCompletedAt = new Date(saved).toISOString();
} catch {}
let journeyCompletions = [];
try {
  const saved = JSON.parse(localStorage.getItem("logostype-journey-completions") || "[]");
  if (Array.isArray(saved))
    journeyCompletions = saved
      .filter((value) => typeof value === "string" && Number.isFinite(Date.parse(value)))
      .map((value) => new Date(value).toISOString());
} catch {}
journeyCompletions = [...new Set([...journeyCompletions, ...(journeyCompletedAt ? [journeyCompletedAt] : [])])].sort();
try {
  const saved = Number(localStorage.getItem("logostype-book-progress"));
  if (Number.isSafeInteger(saved) && saved >= 0) bookProgress = saved;
} catch {}
const journeyBooks = scriptureBookEnds.map((end, i) => ({
  name: scriptureReferences[end - 1].replace(/ \d+:\d+$/, ""),
  start: i ? scriptureBookEnds[i - 1] : 0,
  end,
}));
let selectedJourneyBook = "",
  bookJourneys = {};
function validateBookJourneys(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid book journey progress.");
  const result = {};
  for (const [name, state] of Object.entries(value)) {
    const book = journeyBooks.find((book) => book.name === name);
    if (
      !book ||
      !state ||
      !Number.isInteger(state.progress) ||
      state.progress < 0 ||
      state.progress > book.end - book.start ||
      !Array.isArray(state.completions) ||
      state.completions.some((date) => typeof date !== "string" || !Number.isFinite(Date.parse(date)))
    )
      throw new Error("Invalid book journey progress.");
    result[name] = {
      progress: state.progress,
      completions: [...new Set(state.completions.map((date) => new Date(date).toISOString()))].sort(),
    };
  }
  return result;
}
try {
  bookJourneys = validateBookJourneys(JSON.parse(localStorage.getItem("logostype-book-journeys") || "{}"));
  const saved = localStorage.getItem("logostype-selected-book");
  if (journeyBooks.some((book) => book.name === saved)) selectedJourneyBook = saved;
} catch {}
function currentJourney() {
  if (currentMenu === "collaborative" && window.collaborativeJourneys?.journey()) return window.collaborativeJourneys.journey();
  const book = journeyBooks.find((book) => book.name === selectedJourneyBook);
  if (!book)
    return {
      name: "Entire Scriptures",
      start: 0,
      end: scriptureLines.length,
      progress: bookProgress,
      completions: journeyCompletions,
    };
  const state = bookJourneys[book.name] || { progress: 0, completions: [] };
  return { ...book, ...state };
}
// Out-of-order completions supplement the existing contiguous progress counters.
let journeyShuffled = {}, journeyShuffle = false, shuffledPosition = null;
function validateJourneyShuffled(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid shuffled progress.");
  const result = {};
  for (const [name, state] of Object.entries(value)) {
    const book = journeyBooks.find(book => book.name === name);
    if ((name !== "Entire Scriptures" && !book) || !state || !Array.isArray(state.verses) ||
        state.verses.some(index => !Number.isInteger(index) || index < (book?.start || 0) || index >= (book?.end || scriptureReferences.length)) ||
        (state.cycle !== null && (typeof state.cycle !== "string" || !Number.isFinite(Date.parse(state.cycle))))) throw new Error("Invalid shuffled progress.");
    result[name] = { cycle: state.cycle, verses: [...new Set(state.verses)] };
  }
  return result;
}
try {
  journeyShuffled = validateJourneyShuffled(JSON.parse(localStorage.getItem("logostype-journey-shuffled") || "{}"));
  journeyShuffle = localStorage.getItem("logostype-journey-shuffle") === "true";
} catch {}
function shuffledVerses(journey) {
  if (journey.collaborative) return journey.verses.filter(index => index >= journey.start + journey.progress);
  const state = journeyShuffled[journey.name];
  return state?.cycle === (journey.completions.at(-1) || null) ? state.verses : [];
}
function journeyVerseCompleted(journey, index) {
  return index < journey.start + journey.progress || shuffledVerses(journey).includes(index);
}
function journeyRangeCompleted(journey, start, end) {
  for (let index = start; index < end; index++) if (!journeyVerseCompleted(journey, index)) return false;
  return true;
}
function journeyPosition() {
  if (currentMenu === "collaborative" && window.collaborativeJourneys?.journey()) return window.collaborativeJourneys.position();
  const journey = currentJourney();
  if (!journeyShuffle) return journey.start + journey.progress;
  if (shuffledPosition !== null && shuffledPosition >= journey.start && shuffledPosition < journey.end && !journeyVerseCompleted(journey, shuffledPosition)) return shuffledPosition;
  const remaining = [];
  for (let index = journey.start + journey.progress; index < journey.end; index++) if (!journeyVerseCompleted(journey, index)) remaining.push(index);
  shuffledPosition = remaining.length ? remaining[Math.floor(Math.random() * remaining.length)] : journey.end;
  return shuffledPosition;
}
function recordJourneyVerse(index) {
  const journey = currentJourney();
  const verses = new Set(shuffledVerses(journey));
  verses.add(index);
  let progress = journey.progress;
  while (progress < journey.end - journey.start && verses.has(journey.start + progress)) verses.delete(journey.start + progress++);
  journeyShuffled[journey.name] = { cycle: journey.completions.at(-1) || null, verses: [...verses] };
  try { localStorage.setItem("logostype-journey-shuffled", JSON.stringify(journeyShuffled)); } catch {}
  return progress;
}
function saveBookJourneys() {
  try {
    localStorage.setItem("logostype-book-journeys", JSON.stringify(bookJourneys));
  } catch {}
}
// Keep completion date arrays compatible; store start metadata separately.
let journeyDates = {};
function validateJourneyDates(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid journey dates.");
  const result = {};
  const date = value => {
    if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) throw new Error("Invalid journey date.");
    return new Date(value).toISOString();
  };
  for (const [name, state] of Object.entries(value)) {
    if ((name !== "Entire Scriptures" && !journeyBooks.some(book => book.name === name)) ||
        !state || typeof state !== "object" || !state.completions || typeof state.completions !== "object" || Array.isArray(state.completions)) throw new Error("Invalid journey dates.");
    const startedAt = state.startedAt == null ? null : date(state.startedAt);
    const afterCompletion = state.afterCompletion == null ? null : date(state.afterCompletion);
    if (startedAt && afterCompletion && startedAt < afterCompletion) throw new Error("Invalid journey start date.");
    const completions = {};
    for (const [completed, started] of Object.entries(state.completions)) {
      const end = date(completed), start = started == null ? null : date(started);
      if (start && start > end) throw new Error("Journey starts after completion.");
      completions[end] = start;
    }
    result[name] = { startedAt, afterCompletion, completions };
  }
  return result;
}
try { journeyDates = validateJourneyDates(JSON.parse(localStorage.getItem("logostype-journey-dates") || "{}")); } catch {}
function saveJourneyDates() {
  try { localStorage.setItem("logostype-journey-dates", JSON.stringify(journeyDates)); } catch {}
}
function currentJourneyDates(name, completions) {
  const afterCompletion = completions[completions.length - 1] || null;
  let state = journeyDates[name];
  if (!state) state = journeyDates[name] = { startedAt: null, afterCompletion, completions: {} };
  if (state.afterCompletion !== afterCompletion) { state.startedAt = null; state.afterCompletion = afterCompletion; }
  return state;
}
function trackJourneyStart() {
  const journey = currentJourney();
  const state = currentJourneyDates(journey.name, journey.completions);
  if (journey.progress === 0 && !state.startedAt) state.startedAt = new Date().toISOString();
  saveJourneyDates();
}
function trackJourneyCompletion(name, completedAt, previousCompletions) {
  const state = currentJourneyDates(name, previousCompletions);
  state.completions[completedAt] = state.startedAt;
  saveJourneyDates();
}
function resetJourneyStart(name, completions) {
  const state = currentJourneyDates(name, completions);
  state.startedAt = null;
  saveJourneyDates();
}
function journeyCompletionDatesMarkup(name, completedAt) {
  const startedAt = journeyDates[name]?.completions[completedAt];
  return '<span>started: ' + (startedAt ? escapeHtml(new Date(startedAt).toLocaleString()) : 'not recorded') +
    '</span><br><span>completed: ' + escapeHtml(new Date(completedAt).toLocaleString()) + '</span>';
}
function mergeJourneyDates(existing, incoming) {
  const merged = validateJourneyDates(existing);
  for (const [name, state] of Object.entries(validateJourneyDates(incoming))) {
    const local = merged[name];
    if (!local) { merged[name] = state; continue; }
    const newest = (state.afterCompletion || '') > (local.afterCompletion || '') ? state : local;
    const startedAt = state.afterCompletion === local.afterCompletion
      ? [local.startedAt, state.startedAt].filter(Boolean).sort()[0] || null : newest.startedAt;
    const completions = { ...local.completions };
    for (const [end, start] of Object.entries(state.completions)) {
      completions[end] = [completions[end], start].filter(Boolean).sort()[0] || null;
    }
    merged[name] = { startedAt, afterCompletion: newest.afterCompletion, completions };
  }
  return merged;
}
// Attempts are saved on the first character so abandoned attempts survive reloads.
let journeyAttempts = [],
  activeJourneyAttempt = null;
function validateJourneyAttempts(value) {
  if (!Array.isArray(value)) throw new Error("Invalid journey attempts.");
  return value.map((item) => {
    if (
      !item ||
      typeof item.id !== "string" ||
      !item.id.length ||
      item.id.length > 100 ||
      !scriptureReferences.includes(item.reference) ||
      (item.journey !== "Entire Scriptures" && !journeyBooks.some((book) => book.name === item.journey)) ||
      (item.typingMs !== null && (!Number.isSafeInteger(item.typingMs) || item.typingMs < 0))
    )
      throw new Error("Invalid journey attempt.");
    const elapsedMs = item.elapsedMs ?? item.typingMs ?? 0;
    if (!Number.isSafeInteger(elapsedMs) || elapsedMs < 0) throw new Error("Invalid journey attempt time.");
    return {
      id: item.id,
      reference: item.reference,
      journey: item.journey,
      typingMs: item.typingMs,
      elapsedMs: Math.max(elapsedMs, item.typingMs ?? 0),
    };
  });
}
try {
  journeyAttempts = validateJourneyAttempts(JSON.parse(localStorage.getItem("logostype-journey-attempts") || "[]"));
} catch {}
function saveJourneyAttempts() {
  try {
    localStorage.setItem("logostype-journey-attempts", JSON.stringify(journeyAttempts));
  } catch {}
}
function startJourneyAttempt() {
  if (currentMenu === "collaborative") return;
  trackJourneyStart();
  activeJourneyAttempt = {
    id: crypto.randomUUID?.() || Date.now().toString(36) + Math.random().toString(36).slice(2),
    reference: scriptureReferences[journeyPosition()],
    journey: selectedJourneyBook || "Entire Scriptures",
    typingMs: null,
  };
  journeyAttempts.push(activeJourneyAttempt);
  saveJourneyAttempts();
  updateBookProgress();
}
function checkpointJourneyAttempt() {
  if (!activeJourneyAttempt || !start) return;
  const elapsedMs = Math.max(0, Date.now() - start);
  activeJourneyAttempt.elapsedMs = Math.max(activeJourneyAttempt.elapsedMs || 0, elapsedMs);
  saveJourneyAttempts();
}
window.addEventListener("pagehide", checkpointJourneyAttempt);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) checkpointJourneyAttempt();
});
function journeyTypingStats() {
  const attempts = journeyAttempts.filter((item) => item.journey === (selectedJourneyBook || "Entire Scriptures"));
  const seconds = attempts.reduce((sum, item) => sum + (item.typingMs ?? 0), 0) / 1000;
  const format = (seconds) => `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m ${(seconds % 60).toFixed(2)}s`;
  const allSeconds = attempts.reduce((sum, item) => sum + (item.elapsedMs ?? item.typingMs ?? 0), 0) / 1000;
  return `Time spent typing (successful attempts): ${format(seconds)} · Total time spent (all attempts): ${format(allSeconds)}`;
}
let activeCelebration = null;
function celebrateJourney(colorCount = 1, durationMs = 4500 * colorCount) {
  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (motion.matches || document.hidden) return;
  colorCount = Math.max(1, Math.min(7, Math.floor(colorCount)));
  // A new record and a chapter/book milestone can happen in the same task.
  if (activeCelebration) {
    if (activeCelebration.colors >= colorCount) return;
    activeCelebration.stop();
  }
  const canvas = document.createElement("canvas");
  canvas.setAttribute("aria-hidden", "true");
  canvas.style.cssText = "position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:1000";
  const context = canvas.getContext("2d");
  if (!context) return;
  const colors = ["#e2b714", "#88c0d0", "#ebbcba", "#a3be8c", "#f5f5f5", "#e67e50", "#e65d80"].slice(0, colorCount);
  // Cache rotation once instead of saving, rotating, and restoring for every piece on every frame.
  const sprites = document.createElement("canvas"), cell = 24, rotations = 16;
  sprites.width = cell * rotations; sprites.height = cell * colors.length;
  const spriteContext = sprites.getContext("2d");
  if (!spriteContext) return;
  colors.forEach((color, row) => {
    for (let angle = 0; angle < rotations; angle++) {
      spriteContext.save();
      spriteContext.translate(angle * cell + cell / 2, row * cell + cell / 2);
      spriteContext.rotate(angle / rotations * Math.PI * 2);
      spriteContext.fillStyle = color;
      spriteContext.fillRect(-4, -6, 8, 12);
      spriteContext.restore();
    }
  });
  let width, height, scale;
  function resize() {
    width = Math.max(1, window.innerWidth); height = Math.max(1, window.innerHeight);
    scale = Math.min(1, Math.sqrt(1000000 / (width * height)));
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    context.setTransform(scale, 0, 0, scale, 0, 0);
  }
  resize();
  const pieces = Array.from({ length: Math.min(96, Math.max(40, Math.round(width * height / 12000))) }, (_, index) => ({
    x: Math.random() * width, y: -20 - Math.random() * height * 0.5,
    vx: (Math.random() - 0.5) * 180, vy: 100 + Math.random() * 180,
    angle: Math.random() * Math.PI, spin: (Math.random() - 0.5) * 8,
    color: index % colors.length, born: 0,
  }));
  let started, last, frameId, frames = 0, slowFrames = 0;
  const animation = { colors: colorCount, stop() {
    if (frameId !== undefined) cancelAnimationFrame(frameId);
    canvas.remove();
    document.removeEventListener("visibilitychange", visibilityChanged);
    if (activeCelebration === animation) activeCelebration = null;
  } };
  function visibilityChanged() { if (document.hidden) animation.stop(); }
  activeCelebration = animation;
  document.addEventListener("visibilitychange", visibilityChanged);
  document.body.append(canvas);
  function frame(now) {
    if (activeCelebration !== animation) return;
    if (document.hidden || motion.matches) { animation.stop(); return; }
    started ??= now;
    const elapsed = now - started;
    if (elapsed >= durationMs) { animation.stop(); return; }
    if (window.innerWidth !== width || window.innerHeight !== height) resize();
    if (last !== undefined) {
      frames++;
      if (now - last > 34) slowFrames++;
      if (frames >= 30) {
        if (slowFrames > 10 && pieces.length > 24) pieces.length = Math.max(24, Math.floor(pieces.length * 0.75));
        frames = 0; slowFrames = 0;
      }
    }
    last = now;
    context.clearRect(0, 0, width, height);
    context.globalAlpha = Math.max(0, Math.min(1, (durationMs - elapsed) / 800));
    for (const piece of pieces) {
      const age = (elapsed - piece.born) / 1000;
      const x = piece.x + piece.vx * age, y = piece.y + piece.vy * age + 35 * age * age;
      if (y > height + cell && colorCount > 1 && elapsed < durationMs - 800) {
        piece.x = Math.random() * width; piece.y = -20;
        piece.vy = 100 + Math.random() * 180; piece.born = elapsed;
        continue;
      }
      if (x < -cell || x > width + cell || y < -cell || y > height + cell) continue;
      const angle = ((piece.angle + piece.spin * age) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
      const rotation = Math.floor(angle / (Math.PI * 2) * rotations);
      context.drawImage(sprites, rotation * cell, piece.color * cell, cell, cell, x - cell / 2, y - cell / 2, cell, cell);
    }
    frameId = requestAnimationFrame(frame);
  }
  frameId = requestAnimationFrame(frame);
}
function setReadingView(active) {
  window.collaborativeJourneys?.unmount();
  document.body.classList.remove("collaborative-mode");
  if ($("#collaborativeContent")) $("#collaborativeContent").hidden = true;
  document.body.classList.toggle("reading-mode", active);
  $("#typingContent").hidden = active;
  $("#readingContent").hidden = !active;
}
function syncNavigation(racing = false) {
  const reading = document.body.classList.contains("reading-mode") && !racing;
  const collaborative = currentMenu === "collaborationSetup" && !racing;
  $("#collaborative").classList.toggle("active", collaborative);
  if (racing && window.friendRace?.active) setReadingView(false);
  $("#readJourney").classList.toggle("active", reading);
  $("#home").classList.toggle("active", !racing && !reading && !collaborative && mode !== "book");
  $("#book").classList.toggle("active", !racing && !reading && !collaborative && mode === "book");
  $("#friends").classList.toggle("active", racing);
}
function updateBookProgress(message = "") {
  const active = ["journey", "collaborative"].includes(currentMenu) && mode === "book" && !window.friendRace?.active;
  document.body.classList.toggle("book-mode", active);
  $("#bookProgress").hidden = !active;
  $("#journeyProgress").hidden = !active;
  $("#journeyOptions").hidden = !active;
  $("#shuffleJourney").setAttribute("aria-pressed", String(currentMenu === "collaborative" ? window.collaborativeJourneys.shuffle() : journeyShuffle));
  $("#journeyLocalProgress").hidden = !active;
  if (!active) {
    $("#restart").title = "Restart test";
    $("#restart").setAttribute("aria-label", "Restart test");
    return;
  }
  const journey = currentJourney(),
    size = journey.end - journey.start;
  const completed = Math.min(journey.progress, size),
    position = Math.min(journeyPosition(), journey.end);
  const completedWords = (scriptureWordTotals[journey.start + completed] || 0) - (scriptureWordTotals[journey.start] || 0) + shuffledVerses(journey).filter(index => index >= journey.start + completed).reduce((sum, index) => sum + scriptureWordTotals[index + 1] - scriptureWordTotals[index], 0);
  const totalWords = (scriptureWordTotals[journey.end] || 0) - (scriptureWordTotals[journey.start] || 0);
  const percent = totalWords ? (completedWords / totalWords) * 100 : 0;
  if (size > 0) {
    const index = Math.min(position, journey.end - 1);
    const book = journeyBooks.find((book) => index >= book.start && index < book.end);
    const chapterEnd = scriptureChapterEnds.find((end) => end > index);
    const chapterIndex = scriptureChapterEnds.indexOf(chapterEnd);
    const chapterStart = chapterIndex > 0 ? scriptureChapterEnds[chapterIndex - 1] : 0;
    const chapterName = scriptureReferences[index].split(":")[0];
    for (const [scope, name, rangeStart, rangeEnd] of [
      ["Chapter", chapterName, chapterStart, chapterEnd],
      ["Book", book.name, book.start, book.end],
    ]) {
      const chapters =
        scope === "Book" ? scriptureChapterEnds.filter((end) => end > rangeStart && end <= rangeEnd) : null;
      const count = chapters
        ? chapters.filter((end) => journeyRangeCompleted(journey, Math.max(rangeStart, scriptureChapterEnds[scriptureChapterEnds.indexOf(end) - 1] || 0), end)).length
        : Array.from({length: rangeEnd - rangeStart}, (_, offset) => rangeStart + offset).filter(index => journeyVerseCompleted(journey, index)).length;
      const total = chapters ? chapters.length : rangeEnd - rangeStart,
        unit = chapters ? "chapters" : "verses";
      $("#current" + scope + "Label").textContent = `current ${scope.toLowerCase()} · ${name}`;
      $("#current" + scope + "Count").textContent =
        `${count} / ${total} ${unit} · ${((count / total) * 100).toFixed(1)}%`;
      const bar = $("#current" + scope + "Progress");
      bar.max = total;
      bar.value = count;
      bar.setAttribute("aria-valuetext", `${count} of ${total} ${unit} completed in ${name}`);
    }
  }

  $("#journeyLabel").textContent = journey.collaborative ? journey.name : selectedJourneyBook || "scriptures";
  $("#chooseJourney").textContent = journey.collaborative ? "personal journeys ▦" : (selectedJourneyBook || "entire Scriptures") + " ▦";
  $("#chooseCollaborations").setAttribute("aria-pressed", String(!!journey.collaborative));
  $("#journeyProgressFill").style.height = percent + "%";
  $("#journeyProgressValue").textContent = percent.toFixed(2) + "%";
  $("#journeyProgressCount").textContent = `${completedWords.toLocaleString()} / ${totalWords.toLocaleString()} words`;
  $("#journeyBookCount").textContent = (journey.collaborative ? journey.scope : selectedJourneyBook)
    ? `${completed === size ? 1 : 0} / 1 books`
    : `${journeyBooks.filter(book => journeyRangeCompleted(journey, book.start, book.end)).length} / ${scriptureBookEnds.length} books`;
  $("#journeyWordCount").textContent = `${completedWords.toLocaleString()} / ${totalWords.toLocaleString()} words`;
  $("#journeyWordPercent").textContent =
    `${(totalWords ? (completedWords / totalWords) * 100 : 0).toFixed(2)}% of ${journey.name} words completed`;
  $("#journeyProgressTrack").setAttribute("aria-valuenow", String(completedWords));
  $("#journeyProgressTrack").setAttribute("aria-valuemax", String(totalWords || 1));
  $("#journeyProgressTrack").setAttribute("aria-label", `Words completed in ${journey.name}`);
  $("#journeyProgressTrack").setAttribute(
    "aria-valuetext",
    `${completedWords} of ${totalWords} words completed (${percent.toFixed(2)}%)`,
  );
  const finished = size > 0 && completed === size;
  const progressLabel = $("#bookProgress");
  if (finished) progressLabel.textContent = `${journey.name} journey complete — every verse completed.`;
  else progressLabel.innerHTML = `<strong>${escapeHtml(scriptureReferences[position] || "Scripture journey")}</strong><span class="journey-instruction">${escapeHtml(message || "correct all typos to advance")}</span>`;
  const completedAt = journey.collaborative ? null : selectedJourneyBook ? journey.completions.at(-1) : journeyCompletedAt;
  if (finished && completedAt)
    $("#bookProgress").textContent += ` Completed on ${new Date(completedAt).toLocaleString()}.`;
  if (finished && !journey.collaborative) $("#bookProgress").textContent += " " + journeyTypingStats();
  $("#restart").disabled = false;
  $("#restart").title = finished ? `Start a new ${journey.name} journey` : "Restart verse";
  $("#restart").setAttribute("aria-label", $("#restart").title);
}

function restartTest() {
  if (window.friendRace?.active) { window.friendRace.restartReplay(); return; }
  const journey = currentJourney();
  if (currentMenu === "collaborative") { reset(); input.focus(); return; }
  if (mode === "book" && selectedJourneyBook && journey.progress === journey.end - journey.start) {
    resetJourneyStart(journey.name, journey.completions);
    bookJourneys[selectedJourneyBook] = { progress: 0, completions: journey.completions };
    saveBookJourneys();
  } else if (
    mode === "book" &&
    scriptureLines.length &&
    bookProgress >= scriptureLines.length &&
    !selectedJourneyBook
  ) {
    resetJourneyStart("Entire Scriptures", journeyCompletions);
    bookProgress = 0;
    journeyCompletedAt = null;
    try {
      localStorage.setItem("logostype-journey-completions", JSON.stringify(journeyCompletions));
      localStorage.setItem("logostype-book-progress", "0");
      localStorage.removeItem("logostype-journey-completed-at");
    } catch {}
  }
  reset();
  input.focus();
}
function renderBookContext() {
  const journey = currentJourney(),
    position = journeyPosition();
  for (const [id, index] of [
    ["previousVerse", position - 1],
    ["followingVerse", position + 1],
  ]) {
    const element = $("#" + id);
    element.hidden =
      mode !== "book" ||
      !!window.friendRace?.active ||
      !scriptureLines[index] ||
      index < journey.start ||
      index >= journey.end;
    element.classList.toggle("completed", !element.hidden && journeyVerseCompleted(journey, index));
    if (element.hidden) continue;
    element.querySelector(".verse-context-reference").textContent = scriptureReferences[index];
    element.querySelector("p").textContent = scriptureLines[index];
  }
}
let currentMenu = "journey";
const menuStates = new Map();
function pauseMenu() {
  if (currentMenu === "collaborationSetup" || currentMenu === "reading" || currentMenu === "race" || currentMenu === "raceLobby") return;
  checkpointJourneyAttempt();
  clearInterval(timer);
  timer = null;
  const resultText = {};
  for (const id of ["wpm", "rawWpm", "accuracy", "testType", "resultDetails", "counter"]) resultText[id] = $("#" + id).textContent;
  menuStates.set(currentMenu, {
    mode, limit, punctuation, capitalization, target, rawTarget, typed, lastInput, start, lastResultId,
    done, total, errors, samples, instantSamples, rawSamples, sampleTimes, mistakeEvents,
    attemptReplayEvents, recentCorrect, testReferences, testSourceRanges, activeJourneyAttempt, resultText,
    inputValue: input.value, pausedAt: Date.now(),
  });
  activeJourneyAttempt = null;
  document.body.classList.remove("focus", "running");
}
function switchTypingMenu(destination) {
  document.body.classList.remove("race-lobby-open");
  $("#raceLobby").hidden = true;
  if (currentMenu === destination) { input.focus(); return; }
  pauseMenu();
  currentMenu = destination;
  setReadingView(false);
  const state = menuStates.get(destination);
  if (state) {
    ({ mode, limit, punctuation, capitalization, target, rawTarget, typed, lastInput, start, lastResultId,
       done, total, errors, samples, instantSamples, rawSamples, sampleTimes, mistakeEvents,
       attemptReplayEvents, recentCorrect, testReferences, testSourceRanges, activeJourneyAttempt } = state);
    const pause = Date.now() - state.pausedAt;
    if (start && !done) {
      start += pause;
      recentCorrect = recentCorrect.map(hit => ({ ...hit, time: hit.time + pause }));
      timer = setInterval(tickTest, 50);
      document.body.classList.add("running");
    }
    input.value = state.inputValue;
    input.disabled = (!scriptureLines.length && mode !== "custom") ||
      (mode === "book" && currentJourney().progress >= currentJourney().end - currentJourney().start);
    $("#results").style.display = done ? "block" : "none";
    $("#testSection").style.display = done ? "none" : "block";
    for (const [id, text] of Object.entries(state.resultText)) $("#" + id).textContent = text;
    $("#testReferences").textContent = testReferences.join(" · ");
    $("#testReferences").hidden = !done || !["time", "words", "quote"].includes(mode) || !testReferences.length;
    $("#chart").hidden = false;
    $("#chartLegend").hidden = false;
    $("#wpm").parentElement.hidden = false;
    $("#rawWpm").parentElement.hidden = false;
    updateBookProgress(); limits(); render(false); syncNavigation();
    $("#replayAllResult").hidden = !history.find(result => result.id === lastResultId)?.raceReplay;
    $("#replayAllResult").textContent = history.find(result => result.id === lastResultId)?.raceReplay?.relay ? "▶ replay all lanes" : "▶ replay all racers";
    if (done) drawChart();
  } else {
    mode = ["journey", "collaborative"].includes(destination) ? "book" : lastTypingMode;
    limit = mode === "time" ? 15 : 25;
    punctuation = capitalization = false;
    reset();
  }
  $("#modes").querySelectorAll("button").forEach(b => b.classList.toggle("active", b.dataset.mode === mode));
  $("#punct").classList.toggle("active", punctuation);
  $("#punct").setAttribute("aria-pressed", String(punctuation));
  if (done) $("#again").focus(); else input.focus();
}
function enterBook() {
  if (window.collaborativeJourneys?.selected()) { window.collaborativeJourneys.openJourney(); return; }
  if (mode !== "book" && currentMenu === "typing") lastTypingMode = mode;
  switchTypingMenu("journey");
}
function enterTyping() {
  switchTypingMenu("typing");
}

function showInvalidJourneyResult() {
  sampleWpm(true);
  const chartData=captureChart();
  let dialog=$("#invalidJourneyDialog");
  if(!dialog){
    dialog=document.createElement('dialog');dialog.id='invalidJourneyDialog';
    dialog.setAttribute('aria-labelledby','invalidJourneyTitle');
    dialog.innerHTML='<button type="button" class="close" aria-label="Close invalid result">×</button><h2 id="invalidJourneyTitle">Verse result invalid</h2><p>This verse was not saved or counted toward journey progress because its average speed was 300 WPM or higher over more than one second. Try the verse again.</p><p id="invalidJourneySummary"></p><canvas id="invalidJourneyChart" role="img" aria-label="Invalid verse typing speed chart"></canvas>'+chartLegend('invalidJourneyChart')+'<button type="button" class="option" data-retry-invalid>retry verse</button>';
    document.body.append(dialog);
    dialog.querySelector('.close').onclick=()=>dialog.close();
    dialog.querySelector('[data-retry-invalid]').onclick=()=>dialog.close();
    dialog.addEventListener('close',()=>input.focus());
  }
  $('#invalidJourneySummary').textContent=scriptureReferences[journeyPosition()]+' · '+speed()+' WPM · '+((Date.now()-start)/1000).toFixed(2)+'s';
  const canvas=$('#invalidJourneyChart');canvas._chartData=chartData;
  if(!dialog.open)dialog.showModal();
  drawChart(canvas,chartData);
  dialog.querySelector('[data-retry-invalid]').focus();
}
function completeBookVerse() {
  if (mode !== "book") return;
  const previousPosition = journeyPosition();
  const invalidSpeed = speed() >= 300 && start && Date.now() - start > 1000;
  const complete = typed === target && target.length > 0 && !parseTyping(input.value).extraCount;
  if(invalidSpeed && complete){showInvalidJourneyResult();return false;}
  const passed = !invalidSpeed && complete;
  if (passed) {
    if (!done) sampleWpm(true);
    if (activeJourneyAttempt) {
      checkpointJourneyAttempt();
      activeJourneyAttempt.typingMs = activeJourneyAttempt.elapsedMs;
      saveJourneyAttempts();
      activeJourneyAttempt = null;
    }
    const result = {
      id: crypto.randomUUID?.() || Date.now().toString(36) + Math.random().toString(36).slice(2),
      wpm: speed(),
      durationMs: Math.max(0, Date.now() - start),
      rawWpm: rawSpeed(),
      accuracy: total ? Math.round(((total - errors) / total) * 100) : 100,
      mode: "book",
      punctuation: true,
      capitalization: true,
      limit: 1,
      date: new Date().toLocaleString(),
      reference: scriptureReferences[journeyPosition()],
      journey: selectedJourneyBook || "Entire Scriptures",
      ...(currentMenu === "collaborative" ? window.collaborativeJourneys.historyInfo() : {}),
      chart: captureChart(),
      replay: captureAttemptReplay(),
    };
    if (newPersonalRecord(result)) celebrateJourney(1);
    history.unshift(result);
    saveTypingHistory();
  }

  if (currentMenu === "collaborative") {
    if (passed) window.collaborativeJourneys.contribute(previousPosition);
    return passed;
  }

  if (passed && selectedJourneyBook) {
    const journey = currentJourney(),
      size = journey.end - journey.start;
    if (journey.progress < size) {
      const state = { progress: recordJourneyVerse(previousPosition), completions: [...journey.completions] };
      if (state.progress === size) {
        const completedAt = new Date().toISOString();
        trackJourneyCompletion(selectedJourneyBook, completedAt, journey.completions);
        state.completions.push(completedAt);
      }
      bookJourneys[selectedJourneyBook] = state;
      saveBookJourneys();
    }
  } else if (passed && bookProgress < scriptureLines.length) {
    bookProgress = recordJourneyVerse(previousPosition);
    try {
      localStorage.setItem("logostype-book-progress", String(bookProgress));
    } catch {}
    if (bookProgress === scriptureLines.length) {
      journeyCompletedAt = new Date().toISOString();
      trackJourneyCompletion("Entire Scriptures", journeyCompletedAt, journeyCompletions);
      journeyCompletions.push(journeyCompletedAt);
      try {
        localStorage.setItem("logostype-journey-completed-at", journeyCompletedAt);
        localStorage.setItem("logostype-journey-completions", JSON.stringify(journeyCompletions));
      } catch {}
    }
  }
  const position = currentJourney().start + currentJourney().progress;
  if (passed && position > previousPosition) {
    if (!selectedJourneyBook && position === scriptureLines.length) celebrateJourney(7);
    else if (scriptureBookEnds.includes(position)) celebrateJourney(3);
    else if (scriptureChapterEnds.includes(position)) celebrateJourney(1);
  }
  updateBookProgress(passed ? "" : "Correct the remaining typos to advance.");
  $("#again").title = passed ? "Next verse" : "Retry verse";
  $("#again").setAttribute("aria-label", $("#again").title);
  return passed;
}
const defaultCustomText = "And when he sits on the throne of his kingdom, he shall write out for himself a copy of this law in a book, out of [that which is] before the Levitical priests.";
let selectedTestVerse = null;
let mode = "book",
  limit = 15,
  punctuation = false,
  capitalization = false,
  target = "",
  rawTarget = "",
  typed = "",
  start = 0,
  timer = null,
  done = false,
  total = 0,
  errors = 0,
  samples = [],
  instantSamples = [],
  rawSamples = [],
  sampleTimes = [],
  mistakeEvents = [],
  lastResultId = "",
  attemptReplayEvents = [],
  recentCorrect = [],
  custom = defaultCustomText,
  history = [];
try {
  history = JSON.parse(localStorage.getItem("logostype-history") || "[]");
  custom = localStorage.getItem("logostype-custom-text") || defaultCustomText;
} catch {}
const input = $("#typing");
function limits() {
  const values = mode === "time" ? [15, 30, 60, 120] : [10, 25, 50, 100];
  if (mode === "quote") {
    $("#limits").innerHTML = `<button data-random-verse class="${selectedTestVerse === null ? "active" : ""}">random</button><button data-select-verse class="${selectedTestVerse !== null ? "active" : ""}">${selectedTestVerse === null ? "choose verse" : "chosen verse ✎"}</button>`;
    return;
  }
  $("#limits").innerHTML = mode === "custom" || mode === "book" ? "" :
    values.map(n => `<button data-limit="${n}" class="${n === limit ? "active" : ""}">${n}</button>`).join("") +
    (mode === "time"
      ? `<button data-duration class="${values.includes(limit) ? "" : "active"}" aria-label="Custom time duration">${values.includes(limit) ? "custom" : limit + "s ✎"}</button>`
      : `<button data-word-count class="${values.includes(limit) ? "" : "active"}" aria-label="Custom word count">${values.includes(limit) ? "custom" : limit + " words ✎"}</button>`);
}

let testReferences = [];
let testSourceRanges = [];
function generate(append = false) {
  let passage = "",
    sources = [];
  if (mode === "book") {
    const journey = currentJourney();
    passage = journey.progress < journey.end - journey.start ? scriptureLines[journeyPosition()] || "" : "";
  } else if (mode === "custom") passage = custom.trim().replace(/\s+/g, " ");
  else if (scriptureLines.length) {
    let index = Math.floor(Math.random() * scriptureLines.length);
    if (mode === "quote") {
      if (selectedTestVerse !== null) index = selectedTestVerse;
      passage = scriptureLines[index];
      sources.push({ index, text: passage, whole: true });
    } else {
      const count = mode === "words" ? limit : 250;
      let remaining = count;
      while (remaining > 0) {
        const words = scriptureLines[index].split(/\s+/).filter((word) => word.replace(/\p{P}/gu, "").trim());
        const selected = words.slice(0, remaining);
        if (selected.length) sources.push({ index, text: selected.join(" "), whole: selected.length === words.length });
        remaining -= selected.length;
        index = (index + 1) % scriptureLines.length;
      }
      passage = sources.map((source) => source.text).join(" ");
    }
  }
  rawTarget = append && rawTarget ? rawTarget + " " + passage : passage;
  if (!append) testReferences = sources.map((source) => scriptureReferences[source.index]);
  if (!append) testSourceRanges = [];
  let offset = append ? target.length + 1 : 0;
  for (const source of sources) {
    const text = normalizeScripture(source.text);
    if (!text.length) continue;
    testSourceRanges.push({ reference: scriptureReferences[source.index], start: offset });
    offset += text.length + 1;
  }
  return normalizeScripture(passage);
}
let lastInput = "";
function parseTyping(value, capped = false, passage = target) {
  let text = "",
    raw = "";
  const expected = [];
  const spaceTypos = {};
  let extraCount = 0;
  for (const character of value.split("")) {
    if (capped && text.length >= passage.length) break;
    raw += character;
    expected.push(passage[text.length]);
    if (passage[text.length] === " " && character !== " ") {
      spaceTypos[text.length] = (spaceTypos[text.length] || "") + character;
      extraCount++;
      // Extra characters stay at this space until an actual space is typed.
      continue;
    }
    text += character;
  }
  return { text, raw, expected, spaceTypos, extraCount };
}
function render(smooth = true, followCaret = true) {
  renderBookContext();
  const { spaceTypos } = parseTyping(input.value);
  const words = $("#words");
  const markup = window.friendRace?.relayPassageMarkup?.(spaceTypos) ?? typingPassageMarkup(target, typed, spaceTypos);
  if (words._passageMarkup !== markup) { words.innerHTML = markup; words._passageMarkup = markup; }
  positionCaret(smooth, followCaret);
}
function typingPassageMarkup(passage, entered, spaceTypos) {
  let pos = 0;
  return passage
    .split(" ")
    .map((w) => {
      // Show extra characters before the word gap without consuming the space.
      const slot = pos + w.length;
      const typo = spaceTypos[slot] || "";
      let html = '<span class="word">';
      for (const c of w) {
        const isTyped = pos < entered.length;
        const wrong = isTyped && entered[pos] !== c;
        const cursor = pos === entered.length ? " cursor" : "";
        let state = "";
        let content = c;
        if (isTyped) {
          if (wrong) {
            // Keep the expected letter visible so mistakes do not rewrite the passage.
            state = "incorrect";
          } else {
            state = "correct";
            content = entered[pos];
          }
        }
        html += `<span class="letter ${state}${cursor}" data-typing-position="${pos}">${escapeHtml(content)}</span>`;
        pos++;
      }
      // Keep the cursor after the extras, at the untyped space.
      if (typo) {
        html += `<span class="letter incorrect">${escapeHtml(typo)}</span>`;
      }
      html += `<span class="letter${pos === entered.length ? " cursor" : ""}" data-typing-position="${pos}"></span>`;
      pos++;
      return html + "</span>";
    })
    .join("");
}
function positionCaret(smooth = true, followCaret = true) {
  const letter = $(".cursor"),
    caret = $("#typingCaret");
  caret.hidden = !letter;
  if (!letter) return;
  const box = $("#words");
  const lineHeight = parseFloat(getComputedStyle(box).lineHeight);
  if (followCaret) box.scrollTop = document.body.classList.contains("book-mode") || document.body.classList.contains("race-spectator") || document.body.classList.contains("relay-race")
    ? 0
    : Math.max(0, letter.offsetTop - lineHeight);
  const r = letter.getBoundingClientRect(),
    parent = $(".test").getBoundingClientRect();
  if (!smooth) caret.style.transition = "none";
  caret.style.height = r.height + "px";
  caret.style.transform = `translate3d(${r.left - parent.left - 2}px,${r.top - parent.top}px,0)`;
  if (!smooth) {
    void caret.offsetWidth;
    caret.style.transition = "";
  }
  window.friendRace?.paintTextPositions?.();
}
function reset(preservePassage = false) {
  if (mode === "book" && done) preservePassage = false;
  if (window.friendRace?.active && !window.friendRace.preparing) return;
  checkpointJourneyAttempt();
  clearInterval(timer);
  timer = null;
  activeJourneyAttempt = null;
  typed = "";
  lastInput = "";
  input.value = "";
  start = 0;
  done = false;
  total = 0;
  errors = 0;
  samples = [];
  instantSamples = [];
  rawSamples = [];
  sampleTimes = [];
  mistakeEvents = [];
  recentCorrect = [];
  attemptReplayEvents = [];
  lastResultId = "";
  $("#replayAllResult").hidden = true;
  target = preservePassage ? normalizeScripture(rawTarget) : generate();
  input.disabled =
    (!scriptureLines.length && mode !== "custom") ||
    (mode === "book" && currentJourney().progress >= currentJourney().end - currentJourney().start);
  document.body.classList.remove("focus", "running");
  $("#results").style.display = "none";
  $("#testSection").style.display = "block";
  $("#counter").textContent = "";
  syncNavigation(!!window.friendRace?.active);
  updateBookProgress();
  $("#again").title = "Next test";
  $("#again").setAttribute("aria-label", "Next test");
  limits();
  render(false);
}
function averageCorrectCharacters(passage = target, entered = typed, spaceTypos = parseTyping(input.value).spaceTypos) {
  let correct = 0, position = 0;
  while (position < entered.length) {
    const space = passage.indexOf(" ", position);
    const end = space < 0 ? passage.length : space;
    const typedEnd = Math.min(end, entered.length);
    // A word with any remaining mistake earns no credit, including its separator.
    // Extras at its following space also invalidate the word until corrected.
    if (entered.slice(position, typedEnd) === passage.slice(position, typedEnd) && !spaceTypos[end]) {
      correct += typedEnd - position;
      if (entered.length > end && space >= 0) correct++;
    }
    position = end + 1;
  }
  return correct;
}
function speed() {
  const elapsed = Date.now() - start;
  if (!start || elapsed <= 0 || typed.length < 2) return 0;
  return Math.round((averageCorrectCharacters() / 5) * 60000 / elapsed);
}
function rawSpeed() {
  const elapsed = Date.now() - start;
  if (!start || elapsed <= 0 || typed.length < 2) return 0;
  return Math.round((input.value.length / 5) * 60000 / elapsed);
}
function instantSpeed(now = Date.now()) {
  recentCorrect = recentCorrect.filter((hit) => now - hit.time < 3000);
  const elapsed = Math.min(3000, now - start);
  if (!start || elapsed <= 0 || typed.length < 2) return 0;
  return Math.round((recentCorrect.length / 5) * 60000 / elapsed);
}
function recordMistake() {
  errors++;
  mistakeEvents.push({ time: Math.max(0, (Date.now() - start) / 1000), wpm: instantSpeed() });
}
function sampleWpm(final = false) {
  if (typed.length < 2) return;
  const elapsed = Math.max(0, (Date.now() - start) / 1000);
  if (elapsed < 1) return;
  const previous = sampleTimes[sampleTimes.length - 1];
  // Share a 250 ms sampling cadence across typing and race timer ticks.
  if (!final && previous !== undefined && Math.floor(elapsed * 4) <= Math.floor(previous * 4)) return;
  if (elapsed === previous) return;
  samples.push(speed());
  instantSamples.push(instantSpeed());
  rawSamples.push(rawSpeed());
  sampleTimes.push(elapsed);
}
function finish(saveResult = true) {
  if (done) return;
  sampleWpm(true);
  done = true;
  completeBookVerse();
  clearInterval(timer);
  document.body.classList.remove("focus", "running");
  const elapsed = (Date.now() - start) / 1000,
    wpm = speed(),
    accuracy = total ? Math.round(((total - errors) / total) * 100) : 100;
  $("#wpm").textContent = wpm;
  $("#rawWpm").textContent = rawSpeed();
  $("#wpm").parentElement.hidden = !!(window.friendRace?.active && window.friendRace.running);
  $("#rawWpm").parentElement.hidden = $("#wpm").parentElement.hidden;
  $("#chart").hidden = !!(window.friendRace?.active && window.friendRace.running);
  $("#chartLegend").hidden = $("#chart").hidden;
  $("#accuracy").textContent = accuracy + "%";
  $("#testType").textContent = `${mode === "quote" ? "verse" : mode} ${mode === "time" ? limit + "s" : mode === "words" ? limit : ""} · english`;
  const invalidSpeed = mode !== "custom" && wpm >= 300 && elapsed > 1;
  if (invalidSpeed) {
    saveResult = false;
    $("#chart").hidden=false;
    $("#chartLegend").hidden=false;
  }
  $("#resultDetails").textContent = `${elapsed.toFixed(2)}s · ${typed.length} characters · ${errors} errors` + (invalidSpeed ? " · invalid result: average speed must be below 300 WPM for tests longer than one second" : "");
  const references = $("#testReferences");
  if (mode === "time") testReferences = [...new Set(testSourceRanges.filter(source => source.start < typed.length).map(source => source.reference))];
  references.hidden = !["time", "words", "quote"].includes(mode) || !!window.friendRace?.active || !testReferences.length;
  references.textContent = testReferences.join(" · ");
  $("#testSection").style.display = "none";
  $("#results").style.display = "block";
  if (saveResult) {
    const result = {
      id: crypto.randomUUID?.() || Date.now().toString(36) + Math.random().toString(36).slice(2),
      wpm,
      durationMs: Math.max(0, elapsed * 1000),
      rawWpm: rawSpeed(),
      accuracy,
      mode,
      punctuation,
      capitalization,
      limit,
      date: new Date().toLocaleString(),
      ...(mode === "custom" && !window.friendRace?.active && rawTarget === defaultCustomText ? { customPreset: "default" } : {}),
      chart: captureChart(),
      replay: captureAttemptReplay(),
    };
    const record = newPersonalRecord(result, mode === "book" ? history.slice(1) : history);
    if (record) {
      $("#resultDetails").insertAdjacentHTML("beforeend", `<br><span class="new-record">★ ${escapeHtml(record)}</span>`);
      if (mode !== "book") celebrateJourney(1);
    }
    history.unshift(result);
    lastResultId = result.id;
    saveTypingHistory();
  } else {
    lastResultId = "";
    $("#replayAllResult").hidden = true;
  }
  window.friendRace?.report(true, Math.round(elapsed * 1000));
  drawChart();
}
function hideChartHover() {
  $("#chartMarker").hidden = true;
  $("#chartTooltip").hidden = true;
}
function captureChart() {
  return {
    samples: [...samples],
    instantSamples: [...instantSamples],
    rawSamples: [...rawSamples],
    sampleTimes: [...sampleTimes],
    mistakeEvents: mistakeEvents.map((event) => ({ ...event })),
  };
}
function chartLegend(target) {
  return `<div class="chart-legend" data-chart-target="${target}">
    <button type="button" class="average-key" data-chart-series="samples" aria-pressed="true">━ average wpm</button>
    <button type="button" data-chart-series="instantSamples" aria-pressed="true">┄ instant wpm (last 3s)</button>
    <button type="button" class="raw-key" data-chart-series="rawSamples" aria-pressed="true">┈ raw wpm</button>
    <span class="mistake-key">× mistakes</span></div>`;
}
document.addEventListener("click", event => {
  const button = event.target.closest("[data-chart-series]");
  if (!button) return;
  const canvas = document.getElementById(button.closest("[data-chart-target]").dataset.chartTarget);
  const hidden = canvas._hiddenSeries || (canvas._hiddenSeries = new Set());
  const series = button.dataset.chartSeries;
  if (hidden.has(series)) hidden.delete(series); else hidden.add(series);
  button.setAttribute("aria-pressed", String(!hidden.has(series)));
  drawChart(canvas, canvas._chartData || captureChart());
});
function visibleChartData(data) {
  const indices = data.sampleTimes.map((time, index) => time >= 1 ? index : -1).filter(index => index >= 0);
  return { ...data,
    sampleTimes: indices.map(index => data.sampleTimes[index]),
    samples: indices.map(index => data.samples[index]),
    instantSamples: indices.map(index => data.instantSamples[index]),
    rawSamples: indices.map(index => data.rawSamples[index]),
    mistakeEvents: data.mistakeEvents.filter(event => event.time >= 1),
  };
}
function chartTimeRange(times) {
  return { start: 1, span: Math.max(0.001, Math.max(1, ...times) - 1) };
}
function drawChart(c = $("#chart"), data = captureChart()) {
  data = visibleChartData(data);
  c._visibleData = data;
  c.hidden = !data.sampleTimes.length || (c.id === "chart" && !!(window.friendRace?.active && window.friendRace.running) && !(done && mode !== "custom" && speed() >= 300 && Date.now()-start > 1000));
  const legend = document.querySelector(`[data-chart-target="${c.id}"]`);
  if (legend) legend.hidden = c.hidden;
  if (c.id === "chart") hideChartHover();
  if (c.id === "historyChart" && $("#historyChartMarker")) $("#historyChartMarker").hidden = true;
  if (c.hidden) return;
  const { samples, instantSamples, rawSamples, sampleTimes, mistakeEvents } = data;
  const r = c.getBoundingClientRect(),
    d = devicePixelRatio || 1;
  c.width = r.width * d;
  c.height = 170 * d;
  const x = c.getContext("2d");
  x.scale(d, d);
  const w = r.width,
    styles = getComputedStyle(document.body);
  const max = Math.max(100, ...samples, ...instantSamples, ...rawSamples, ...mistakeEvents.map((event) => event.wpm));
  const range = chartTimeRange(sampleTimes);
  x.font = "11px monospace";
  for (let i = 0; i < 5; i++) {
    const y = 15 + i * 32;
    x.strokeStyle = styles.getPropertyValue("--panel");
    x.beginPath();
    x.moveTo(35, y);
    x.lineTo(w, y);
    x.stroke();
    x.fillStyle = styles.getPropertyValue("--muted");
    x.fillText(Math.round(max * (1 - i / 4)), 0, y + 4);
  }
  const ticks = w < 400 ? 2 : 4;
  for (let i = 0; i <= ticks; i++) {
    x.textAlign = i === 0 ? "left" : i === ticks ? "right" : "center";
    x.fillText((range.start + range.span * i / ticks).toFixed(range.span < 10 ? 2 : 0) + "s", 35 + i / ticks * (w - 40), 165);
  }
  x.textAlign = "left";
  for (const [series, values, color, dash] of [
    ["rawSamples", rawSamples, "--muted", [2, 4]],
    ["instantSamples", instantSamples, "--text", [5, 4]],
    ["samples", samples, "--accent", []],
  ]) {
    if (c._hiddenSeries?.has(series)) continue;
    x.strokeStyle = styles.getPropertyValue(color);
    x.lineWidth = 2;
    x.setLineDash(dash);
    x.beginPath();
    values.forEach((v, i) => {
      const px = 35 + ((sampleTimes[i] - range.start) / range.span) * (w - 40);
      const py = 145 - (v / max) * 130;
      if (i === 0) x.moveTo(px, py);
      else x.lineTo(px, py);
    });
    x.stroke();
  }
  x.setLineDash([]);
  x.strokeStyle = styles.getPropertyValue("--error");
  x.lineWidth = 2;
  for (const event of mistakeEvents) {
    const px = 35 + Math.min((event.time - range.start) / range.span, 1) * (w - 40);
    const py = 145 - (event.wpm / max) * 130;
    x.beginPath();
    x.moveTo(px - 4, py - 4);
    x.lineTo(px + 4, py + 4);
    x.moveTo(px - 4, py + 4);
    x.lineTo(px + 4, py - 4);
    x.stroke();
  }
}
function chartHoverPoint(pointerX, width) {
  const times = $("#chart")._visibleData?.sampleTimes || [];
  if (!times.length || width <= 40) return null;
  const range = chartTimeRange(times);
  const x = Math.max(35, Math.min(width - 5, pointerX));
  const time = range.start + ((x - 35) / (width - 40)) * range.span;
  let index = 0;
  for (let i = 1; i < times.length; i++)
    if (Math.abs(times[i] - time) < Math.abs(times[index] - time)) index = i;
  return { x: 35 + ((times[index] - range.start) / range.span) * (width - 40), index };
}
document.addEventListener("pointermove", (event) => {
  const chart = $("#chart");
  if (chart.hidden || !done || !chart.getClientRects().length || document.querySelector('dialog[open]')) {
    hideChartHover();
    return;
  }
  const rect = chart.getBoundingClientRect();
  const dx = Math.max(rect.left - event.clientX, 0, event.clientX - rect.right);
  const dy = Math.max(rect.top - event.clientY, 0, event.clientY - rect.bottom);
  if (Math.hypot(dx, dy) > 24) {
    hideChartHover();
    return;
  }
  const point = chartHoverPoint(event.clientX - rect.left, rect.width);
  if (!point) {
    hideChartHover();
    return;
  }
  const { x, index } = point,
    tooltip = $("#chartTooltip"),
    marker = $("#chartMarker");
  marker.hidden = false;
  marker.style.left = x + "px";
  const plotted = chart._visibleData;
  $("#chartHoverTime").textContent = plotted.sampleTimes[index].toFixed(2) + "s";
  $("#chartHoverAverage").textContent = plotted.samples[index];
  $("#chartHoverInstant").textContent = plotted.instantSamples[index];
  $("#chartHoverRaw").textContent = plotted.rawSamples[index];
  tooltip.hidden = false;
  const tooltipWidth = tooltip.offsetWidth;
  const left = x + 12 + tooltipWidth > rect.width ? x - tooltipWidth - 12 : x + 12;
  tooltip.style.left = Math.max(0, Math.min(rect.width - tooltipWidth, left)) + "px";
});
document.documentElement.addEventListener("pointerleave", hideChartHover);
document.addEventListener("pointercancel", hideChartHover);
window.addEventListener("blur", hideChartHover);
window.addEventListener("resize", () => {
  hideChartHover();
  if (done && !$("#chart").hidden) drawChart();
  const canvas = $("#historyChart");
  if (canvas && $("#modal").open && canvas._chartData) drawChart(canvas, canvas._chartData);
  const invalidCanvas=$("#invalidJourneyChart");
  if(invalidCanvas && $("#invalidJourneyDialog").open)drawChart(invalidCanvas,invalidCanvas._chartData);
});
input.addEventListener("keydown", (event) => {
  if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) event.preventDefault();
});
input.addEventListener("beforeinput", (event) => {
  if (
    (mode !== "time" || window.friendRace?.active) &&
    event.inputType.startsWith("insert") &&
    parseTyping(input.value).text.length >= target.length &&
    input.selectionStart === input.selectionEnd
  )
    event.preventDefault();
});
function tickTest() {
      const elapsed = (Date.now() - start) / 1000;
      if (activeJourneyAttempt && Math.floor(elapsed) > Math.floor((activeJourneyAttempt.elapsedMs || 0) / 1000)) {
        checkpointJourneyAttempt();
        updateBookProgress();
      }
      sampleWpm();
      $("#counter").textContent =
        mode === "time" ? Math.max(0, Math.ceil(limit - elapsed)) :
        mode === "words" ? `${typed.split(" ").length - 1 + Number(typed.length === target.length)}/${target.split(" ").length}` :
        `${typed.length}/${target.length}`;
      if (mode === "time" && elapsed >= limit) finish();
}
input.addEventListener("input", () => {
  if (done) {
    input.value = lastInput;
    return;
  }
  if (window.friendRace?.active && (!window.friendRace.running || input.disabled)) {
    input.value = lastInput;
    return;
  }
  if (mode === "book" && !window.friendRace?.active && !start && !lastInput.length)
    input.value = input.value.replace(/^ +/, "");
  const capped = mode !== "time" || window.friendRace?.active;
  const parsed = parseTyping(input.value, capped),
    v = parsed.text;
  if (input.value !== parsed.raw) input.value = parsed.raw;
  if (mode === "book" && !window.friendRace?.active && !v.length) {
    reset(true);
    return;
  }
  if (!start && v.length) {
    start = Date.now();
    if (mode === "book" && !window.friendRace?.active) startJourneyAttempt();
    document.body.classList.add("focus", "running");
    timer = setInterval(tickTest, 50);
  }
  for (let i = 0; i < parsed.raw.length; i++)
    if (i >= lastInput.length || parsed.raw[i] !== lastInput[i]) {
      total++;
      if (parsed.raw[i] !== parsed.expected[i]) recordMistake();
    }
  recordReplayEdit(lastInput, parsed.raw);
  lastInput = parsed.raw;
  const previousLength = typed.length;
  typed = v.slice(0, target.length);
  recentCorrect = recentCorrect.filter((hit) => hit.position < typed.length);
  for (let i = previousLength; i < typed.length; i++)
    if (typed[i] === target[i]) recentCorrect.push({ time: Date.now(), position: i });
  if (mode === "time" && target.length - typed.length < 100) target += " " + generate(true);
  render();
  window.friendRace?.report(false);
  if (
    mode !== "time" &&
    typed.length >= target.length &&
    v === target && !parsed.extraCount
  ) {
    if (mode === "book") {
      completeBookVerse();
      reset();
      input.focus();
    } else finish();
  }
});
$(".test").onclick = () => input.focus();
$("#restart").onclick = restartTest;
$("#again").onclick = () => {
  reset();
  input.focus();
};
$("#home").onclick = () => {
  if (window.friendRace?.active) {
    window.friendRace.requestLeave(enterTyping);
    return;
  }
  enterTyping();
};
$(".brand").onclick = () => $("#book").click();
$("#modes").onclick = (e) => {
  const m = e.target.dataset.mode;
  if (!m) return;
  mode = m;
  limit = m === "time" ? 15 : 25;
  $("#modes")
    .querySelectorAll("button")
    .forEach((b) => b.classList.toggle("active", b.dataset.mode === m));
  if (m === "custom") openModal("custom");
  reset();
};
$("#limits").onclick = (e) => {
  if (e.target.hasAttribute("data-word-count")) { openModal("wordCount"); return; }
  if (e.target.hasAttribute("data-select-verse")) { openModal("verseSelection"); return; }
  if (e.target.hasAttribute("data-random-verse")) { selectedTestVerse = null; reset(); return; }
  if (e.target.hasAttribute("data-duration")) {
    openModal("duration");
    return;
  }
  if (e.target.dataset.limit) {
    limit = +e.target.dataset.limit;
    reset();
  }
};
$("#punct").onclick = () => {
  if (window.friendRace?.active || mode === "book") return;
  punctuation = capitalization = !punctuation;
  $("#punct").classList.toggle("active", punctuation);
  $("#punct").setAttribute("aria-pressed", String(punctuation));
  reset(true);
};
const themes = {
  "black on white": ["#ffffff", "#f5f5f5", "#000000", "#666666", "#000000"],
  "white on black": ["#000000", "#151515", "#ffffff", "#999999", "#ffffff"],
  "serika dark": ["#323437", "#2c2e31", "#d1d0c5", "#646669", "#e2b714"],
  serika: ["#e1e1e3", "#d1d3d8", "#323437", "#aaaeb3", "#b68b00"],
  nord: ["#2e3440", "#272d38", "#d8dee9", "#6c7a90", "#88c0d0"],
  "rose pine": ["#191724", "#1f1d2e", "#e0def4", "#6e6a86", "#ebbcba"],
};
const defaultThemeColors = { primary: "#ffffff", secondary: "#2457c5", tertiary: "#7351a6" };
let customThemeColors = { ...defaultThemeColors };
try {
  const saved = JSON.parse(localStorage.getItem("logostype-custom-colors"));
  if (saved && Object.keys(defaultThemeColors).every(key => typeof saved[key] === "string" && /^#[0-9a-f]{6}$/i.test(saved[key]))) customThemeColors = saved;
} catch {}
function colorLuminance(color) {
  const channels = color.match(/[0-9a-f]{2}/gi).map(value => {
    const v = parseInt(value, 16) / 255;
    return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4;
  });
  return channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722;
}
function colorContrast(a, b) {
  const x = colorLuminance(a), y = colorLuminance(b);
  return (Math.max(x, y) + .05) / (Math.min(x, y) + .05);
}
function mixThemeColor(a, b, amount) {
  return '#' + [1, 3, 5].map(index => Math.round(parseInt(a.slice(index, index + 2), 16) * (1 - amount) +
    parseInt(b.slice(index, index + 2), 16) * amount).toString(16).padStart(2, '0')).join('');
}
function readableThemeColor(color, surfaces, fallback) {
  for (let step = 0; step <= 100; step++) {
    const candidate = mixThemeColor(color, fallback, step / 100);
    if (surfaces.every(surface => colorContrast(candidate, surface) >= 4.5)) return candidate;
  }
  return fallback;
}
function customThemePalette(colors) {
  const bg = colors.primary;
  const text = colorContrast('#000000', bg) >= colorContrast('#ffffff', bg) ? '#000000' : '#ffffff';
  let panel = mixThemeColor(bg, colors.tertiary, .16);
  const tintedPanel = panel;
  for (let step = 1; step <= 100 && colorContrast(text, panel) < 4.5; step++) panel = mixThemeColor(tintedPanel, bg, step / 100);
  const surfaces = [bg, panel];
  return [bg, panel, text,
    readableThemeColor(mixThemeColor(bg, text, .55), surfaces, text),
    readableThemeColor(colors.secondary, surfaces, text)];
}
function theme(name) {
  if (name !== "custom" && !Object.hasOwn(themes, name)) name = "serika dark";
  const vals = name === "custom" ? customThemePalette(customThemeColors) : themes[name];
  const light = colorLuminance(vals[0]) > .179;
  const surfaces = [vals[0], vals[1]];
  document.documentElement.dataset.theme = name;
  document.documentElement.style.colorScheme = light ? "light" : "dark";
  document.documentElement.style.setProperty("--old-testament", name === "custom" ?
    readableThemeColor(customThemeColors.secondary, surfaces, vals[2]) : light ? "#256579" : "#88c0d0");
  document.documentElement.style.setProperty("--new-testament", name === "custom" ?
    readableThemeColor(customThemeColors.tertiary, surfaces, vals[2]) : light ? "#734799" : "#c4a7e7");
  document.documentElement.style.setProperty("--error", readableThemeColor("#ca4754", surfaces, vals[2]));
  ["--bg", "--panel", "--text", "--muted", "--accent"].forEach((k, i) =>
    document.documentElement.style.setProperty(k, vals[i]),
  );
  $("#themeName").textContent = name === "custom" ? "custom colors" : name;
  try { localStorage.setItem("logostype-theme", name); } catch {}
}

function renderKeyboardShortcuts() {
  return `<h3>keyboard shortcuts</h3>
    <table class="records-table"><thead><tr><th scope="col">key</th><th scope="col">action</th></tr></thead><tbody>
      <tr><td><kbd>1</kbd></td><td>Scripture Journey</td></tr>
      <tr><td><kbd>2</kbd></td><td>Reading</td></tr>
      <tr><td><kbd>3</kbd></td><td>Create or join a collaboration</td></tr>
      <tr><td><kbd>4</kbd></td><td>Typing Test</td></tr>
      <tr><td><kbd>5</kbd></td><td>Race Friends</td></tr>
      <tr><td><kbd>6</kbd></td><td>Records</td></tr>
      <tr><td><kbd>7</kbd></td><td>Typing history</td></tr>
      <tr><td><kbd>J</kbd></td><td>Journey completion records (from records)</td></tr>
      <tr><td><kbd>H</kbd></td><td>Focus the latest visible history result (from history)</td></tr>
      <tr><td><kbd>&#92;</kbd></td><td>Settings</td></tr>
      <tr><td><kbd>Esc</kbd></td><td>Open commands; close an open dialog</td></tr>
      <tr><td><kbd>Tab</kbd>, then <kbd>Enter</kbd></td><td>Restart from the typing field (outside races)</td></tr>
      <tr><td><kbd>Tab</kbd> / <kbd>Shift+Tab</kbd></td><td>Move between controls</td></tr>
      <tr><td>Arrow keys</td><td>Move between controls outside text fields and the reading region</td></tr>
      <tr><td><kbd>N</kbd> / <kbd>P</kbd></td><td>Reading: next / previous chapter</td></tr>
      <tr><td><kbd>Shift+N</kbd> / <kbd>Shift+P</kbd></td><td>Reading: next / previous available book</td></tr>
    </tbody></table>
    <p>Menu and settings shortcuts use no modifier keys. Press 3 to create or join a collaboration, 6 to open records, and 7 to open typing history. They work in records, history, and settings dialogs. They are disabled in text fields, confirmation dialogs, other editors, and while entering a custom typing test. They work on the results screen, including custom test results. Reading chapter and book shortcuts apply while viewing a book, outside dialogs and form fields. Arrow keys are disabled in the typing field; Backspace corrects mistakes.</p>`;
}
function openModal(type) {
  $("#modal").dataset.view = type;
  const content = $("#modalContent");
  if (type === "themes")
    content.innerHTML =
      "<h2>theme</h2>" +
      Object.keys(themes)
        .map((t) => `<button class="option" data-theme="${t}">◐ ${t}</button>`)
        .join("") + '<button class="option" data-open="customTheme">◐ custom colors</button>';
  if (type === "customTheme") content.innerHTML = '<button class="option" data-open="themes">← themes</button><h2>custom colors</h2><form id="customThemeForm"><p>Choose three colors. Text, panels, highlights, and error colors adapt for readability.</p>' +
    [["primary", "primary — background"], ["secondary", "secondary — accents"], ["tertiary", "tertiary — panel tint and supporting accents"]].map(([key, label]) =>
      '<label class="theme-color-field" for="theme-' + key + '"><span>' + label + '</span><input type="color" id="theme-' + key + '" name="' + key + '" value="' + customThemeColors[key] + '"></label>'
    ).join("") + '<button class="option" type="submit">save colors →</button></form>';
  if (type === "records") content.innerHTML = '<h2>records</h2><p>Press J for Journey completion records.</p>' + renderPersonalRecords() + (window.friendRecords?.render() || '') + '<button class="option" data-open="journeyCompletions">↗ journey completion records</button>';
  if (type === "settings")
    content.innerHTML =
      '<h2>settings</h2><h3>your profile</h3><p id="profileJoined">' + escapeHtml(profileJoinedLabel()) + '</p><form id="profileForm"><label for="profileName">your name</label><input class="race-field" id="profileName" maxlength="24" placeholder="typist" autocomplete="nickname"><button class="option" type="submit">save name</button><p id="profileStatus" role="status" aria-live="polite"></p></form><button class="option" data-open="themes">◐ change theme</button><h3 id="fontSizeLabel">font size</h3><div class="font-size-controls" role="group" aria-labelledby="fontSizeLabel"><button class="option" id="fontSmaller" type="button">smaller</button><button class="option" id="fontDefault" type="button">default</button><button class="option" id="fontBigger" type="button">bigger</button></div><h3>your data</h3><div class="data-controls" role="group" aria-label="Progress and typing history backups"><button class="option" id="exportData">export data</button><button class="option" id="importData">import data</button></div><button class="option" id="clearData">clear saved data</button><p>Export a JSON backup of your name, theme and custom colors, Scripture Journey progress, and all saved typing history. Import restores theme settings, merges history, and keeps your furthest progress.</p><p id="dataStatus" role="status" aria-live="polite"></p><p>Tests begin on your first keystroke. Backspace corrects mistakes. Your name, theme, progress, and typing history are saved on this device.</p>';
  if (type === "settings") content.innerHTML += renderKeyboardShortcuts();
  if (type === "about")
    content.innerHTML =
      "<p><a href=\"../../\">← Adless</a></p><h2>logostype</h2><p>Type the Scriptures and read what you typed. Practice on your own or race against friends.</p><p>Inspired by <a href=\"https://monkeytype.com/\" target=\"_blank\" rel=\"noopener noreferrer\">Monkeytype</a> and its minimalist typing experience.</p><p>Speed is measured in words per minute, using five characters per word. Average WPM excludes each word with an uncorrected mistake, including its following space. Correcting the word restores its credit. Accuracy includes all keystrokes, even corrected mistakes.</p>";
  if (type === "history" || type === "profile")
    content.innerHTML =
      '<h2>typing history</h2><p>Press H to focus the latest result.</p>' +
      '<div id="historyProgression">' + renderHistoryProgression() + '</div>' +
      '<p id="historyStorageNotice" role="status"></p><h3>typing history</h3><label for="historySearch">search history</label><input class="race-field" id="historySearch" type="search" placeholder="Date, verse, journey, mode, WPM…"><p id="historyCount" role="status" aria-live="polite"></p><div id="historyResults"></div>';
  if (type === "journeyCompletions")
    content.innerHTML = '<button class="option" data-open="records">← records</button><h2>journey completion records</h2>';
  if (type === "journeyCompletions")
    content.insertAdjacentHTML(
      "beforeend",
      "<h3>Entire Scriptures completions</h3>" +
        (journeyCompletions.length
          ? "<ol>" +
            journeyCompletions
              .slice()
              .reverse()
              .map((date) => "<li>" + journeyCompletionDatesMarkup("Entire Scriptures", date) + "</li>")
              .join("") +
            "</ol>"
          : "<p>No completed journeys yet.</p>"),
    );
  if (type === "profile") {
    content.querySelector("h2").textContent = "your profile";
    content
      .querySelector("h2")
      .insertAdjacentHTML(
        "afterend",
        '<form id="profileForm"><label for="profileName">your name</label><input class="race-field" id="profileName" maxlength="24" placeholder="typist" autocomplete="nickname"><button class="option" type="submit">save name</button><p id="profileStatus" role="status" aria-live="polite"></p></form><p id="dataStatus" role="status" aria-live="polite"></p><h3>typing history</h3>',
      );
  }
  if (type === "custom")
    content.innerHTML =
      '<h2>custom text</h2><textarea id="customText" aria-label="Custom typing text"></textarea><button class="option" type="button" id="saveCustom">save &amp; go →</button><button class="option" type="button" id="defaultCustom">default</button>';
  if (type === "wordCount") content.innerHTML = '<h2>custom word count</h2><form id="wordCountForm"><label for="wordCount">number of words</label><input class="race-field" id="wordCount" type="number" min="1" max="3600" step="1" required><p>Choose 1–3600 words.</p><button class="option" type="submit">start test →</button></form>';
  if (type === "verseSelection") content.innerHTML = '<h2>choose verse</h2><form id="verseSelectionForm"><label for="verseReference">verse reference</label><input class="race-field" id="verseReference" placeholder="John 3:16" autocomplete="off" required><p>Enter a full book name, chapter, and verse, for example 1 Corinthians 13:4.</p><button class="option" type="submit">start test →</button></form>';
  if (type === "duration")
    content.innerHTML =
      '<h2>custom duration</h2><form id="durationForm"><label for="durationSeconds">duration in seconds</label><input class="race-field" id="durationSeconds" type="number" min="1" max="3600" step="1" required><p>Choose 1–3600 seconds. The timer starts on your first keystroke.</p><button class="option" type="submit">apply duration →</button></form>';
  if (type === "commands")
    content.innerHTML =
      '<h2>command line</h2><button class="option" id="restartCommand">↻ restart test</button><button class="option" data-open="themes">◐ theme</button><button class="option" data-open="settings">⚙ settings</button><button class="option" data-open="records">♛ records</button><button class="option" data-open="history">◷ history</button>';
  if (type === "journeyCompletions") {
    const completedBooks = journeyBooks.filter((book) => bookJourneys[book.name]?.completions.length);
    if (completedBooks.length)
      content.insertAdjacentHTML(
        "beforeend",
        "<h3>Book journey completions</h3><ul>" +
          completedBooks
            .map((book) =>
              bookJourneys[book.name].completions
                .map(
                  (date) =>
                    "<li>" + escapeHtml(book.name) + "<br>" + journeyCompletionDatesMarkup(book.name, date) + "</li>",
                )
                .join(""),
            )
            .join("") +
          "</ul>",
      );
    else content.insertAdjacentHTML("beforeend", "<h3>Book journey completions</h3><p>No completed book journeys yet.</p>");
  }
  if (type === "history" || type === "profile") {
    $("#historyDateFrom").value = historyDateFrom;
    $("#historyDateTo").value = historyDateTo;
    updateHistoryDateRange();
    $("#historySearch").value = historySearchQuery;
    renderHistorySearch();
  }
  if (!$("#modal").open) $("#modal").showModal();
  if (type === "settings") $("#profileName").value = getProfileName();
  if (type === "custom") $("#customText").value = custom;
  if (type === "wordCount") { $("#wordCount").value = limit; $("#wordCount").focus(); $("#wordCount").select(); }
  if (type === "verseSelection") {
    const field = $("#verseReference");
    field.value = selectedTestVerse === null ? "" : scriptureReferences[selectedTestVerse];
    field.oninput = () => field.setCustomValidity("");
    field.focus();
  }
  if (type === "duration") {
    $("#durationSeconds").value = limit;
    $("#durationSeconds").focus();
    $("#durationSeconds").select();
  }
}
document.addEventListener("click", (e) => {
  const b = e.target.closest("button");
  if (!b) return;
  if (b.id === "readJourney") {
    if (window.friendRace?.active) window.friendRace.requestLeave(openReadingPage);
    else openReadingPage();
    return;
  }
  if (b.dataset.raceReplayIndex !== undefined) {
    const index = Number(b.dataset.raceReplayIndex);
    openRaceReplay(history[index], index);
    return;
  }
  if (b.dataset.replayIndex !== undefined) {
    const index = Number(b.dataset.replayIndex);
    openAttemptReplay(history[index], index);
    return;
  }
  if (b.dataset.raceAgainstIndex !== undefined) {
    window.friendRace.raceReplay(history[Number(b.dataset.raceAgainstIndex)]);
    return;
  }
  if (b.dataset.retryIndex !== undefined) {
    retrySavedAttempt(history[Number(b.dataset.retryIndex)]);
    return;
  }
  if (b.dataset.historyIndex !== undefined) {
    openHistoryResult(Number(b.dataset.historyIndex));
    return;
  }
  if (b.id === "historyBack") {
    openModal("history");
    return;
  }
  if (b.dataset.dialog) openModal(b.dataset.dialog);
  if (b.dataset.open) openModal(b.dataset.open);
  if (b.dataset.theme) {
    theme(b.dataset.theme);
    $("#modal").close();
  }
  if (b.id === "defaultCustom") { $("#customText").value = defaultCustomText; $("#customText").focus(); }
  if (b.id === "saveCustom") {
    custom = $("#customText").value.trim() || defaultCustomText;
    try { localStorage.setItem("logostype-custom-text", custom); } catch {}
    $("#modal").close();
    reset();
    input.focus();
  }
  if (b.id === "fontSmaller" || b.id === "fontDefault" || b.id === "fontBigger") {
    const words = $("#words");
    const size = parseFloat(getComputedStyle(words).fontSize);
    words.style.fontSize = b.id === "fontDefault" ? "" : Math.max(16, Math.min(64, size + (b.id === "fontBigger" ? 2 : -2))) + "px";
    positionCaret(false);
  }
  if (b.id === "restartCommand") {
    $("#modal").close();
    restartTest();
  }
});
$(".close").onclick = () => $("#modal").close();
$("#modal").onclick = (e) => {
  if (e.target === $("#modal")) $("#modal").close();
};
document.addEventListener("keydown", (e) => {
  if (document.querySelector('dialog[open]:not(#modal)')) return;
  if (e.key === "Escape" && !$("#modal").open) {
    e.preventDefault();
    openModal("commands");
    return;
  }
  if (e.key === "Enter" && document.activeElement?.id === "restart") {
    e.preventDefault();
    restartTest();
    return;
  }
  if (e.key === "Tab" && !$("#modal").open) {
    const active = document.activeElement;
    if (!e.shiftKey && done && $("#again").getClientRects().length &&
        (active === input || active === document.body || $("#testSection").contains(active))) {
      e.preventDefault();
      $("#again").focus();
    } else if (!e.shiftKey && active === input && !window.friendRace?.active) {
      e.preventDefault();
      $("#restart").focus();
    } else if (e.shiftKey && document.activeElement === $("#restart")) {
      e.preventDefault();
      input.focus();
    }
    return;
  }
  if (
    !$("#modal").open &&
    !done && currentMenu !== "raceLobby" && currentMenu !== "collaborationSetup" &&
    !document.body.classList.contains("reading-mode") &&
    e.key.length === 1 &&
    !e.ctrlKey &&
    !e.metaKey &&
    !document.activeElement?.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"])') &&
    document.activeElement !== input
  ) {
    input.focus();
  }
});
try {
  theme(localStorage.getItem("logostype-theme") || "serika dark");
} catch {
  theme("serika dark");
}
reset();
input.focus();

document.addEventListener("submit", (e) => {
  if (e.target.id === "customThemeForm") {
    e.preventDefault();
    customThemeColors = Object.fromEntries(Object.keys(defaultThemeColors).map(key => [key, $("#theme-" + key).value]));
    try { localStorage.setItem("logostype-custom-colors", JSON.stringify(customThemeColors)); } catch {}
    theme("custom");
    $("#modal").close();
    return;
  }
  if (e.target.id === "wordCountForm" || e.target.id === "verseSelectionForm") {
    e.preventDefault();
    if (e.target.id === "wordCountForm") {
      const field = $("#wordCount"), count = Number(field.value);
      if (!field.reportValidity() || !Number.isInteger(count) || count < 1 || count > 3600) return;
      limit = count;
    } else {
      const field = $("#verseReference");
      const reference = field.value.trim().replace(/\s+/g, " ").replace(/\s*:\s*/g, ":").toLowerCase();
      const index = scriptureReferences.findIndex(value => value.toLowerCase() === reference);
      field.setCustomValidity(index < 0 ? "Enter a valid verse reference, such as John 3:16." : "");
      if (!field.reportValidity()) return;
      selectedTestVerse = index;
    }
    $("#modal").close(); reset(); input.focus(); return;
  }
  if (e.target.id !== "durationForm") return;
  e.preventDefault();
  const field = $("#durationSeconds");
  if (!field.reportValidity()) return;
  const seconds = Number(field.value);
  if (!Number.isInteger(seconds) || seconds < 1 || seconds > 3600) return;
  limit = seconds;
  $("#modal").close();
  reset();
  input.focus();
});

window.addEventListener("resize", () => positionCaret(false));
document.fonts?.ready.then(() => positionCaret(false));

function chooseJourney(name) {
  window.collaborativeJourneys?.personal();
  if (currentMenu === "collaborative") switchTypingMenu("journey");
  shuffledPosition = null;
  selectedJourneyBook = name;
  try {
    localStorage.setItem("logostype-selected-book", name);
  } catch {}
  reset();
  input.focus();
}
$("#shuffleJourney").setAttribute("aria-pressed", String(journeyShuffle));
$("#shuffleJourney").onclick = () => {
  if (currentMenu === "collaborative") { window.collaborativeJourneys.toggleShuffle(); reset(); input.focus(); return; }
  journeyShuffle = !journeyShuffle;
  shuffledPosition = null;
  try { localStorage.setItem("logostype-journey-shuffle", String(journeyShuffle)); } catch {}
  $("#shuffleJourney").setAttribute("aria-pressed", String(journeyShuffle));
  reset();
  input.focus();
};
$("#chooseJourney").onclick = () => {
  const content = $("#modalContent");
  content.innerHTML =
    '<h2 id="journeyPickerTitle">choose a journey</h2><p class="testament-legend"><span class="old-testament">Old Testament</span><span class="new-testament">New Testament</span></p><div class="journey-grid" role="group" aria-labelledby="journeyPickerTitle">' +
    ["", ...journeyBooks.map((book) => book.name)]
      .map(
        (name) =>
          '<button type="button" data-journey="' +
          escapeHtml(name) +
          '" class="' +
          (name
            ? journeyBooks.findIndex((book) => book.name === name) < 39
              ? "old-testament"
              : "new-testament"
            : "entire-journey") +
          '" aria-pressed="' +
          (selectedJourneyBook === name) +
          '">' +
          escapeHtml(name || "entire Scriptures") +
          "</button>",
      )
      .join("") +
    "</div>";
  const grid = $(".journey-grid");
  grid.onclick = (event) => {
    const button = event.target.closest("[data-journey]");
    if (!button) return;
    $("#modal").close();
    chooseJourney(button.dataset.journey);
  };
  if (!$("#modal").open) $("#modal").showModal();
  grid.querySelector('[aria-pressed="true"]').focus();
};
$("#book").onclick = () => {
  if (window.friendRace?.active) {
    window.friendRace.requestLeave(enterBook);
    return;
  }
  enterBook();
};
input.disabled = true;
$("#friends").disabled = true;
$("#counter").textContent = "loading RcV text…";


loadScripture()
  .then((lines) => {
    scriptureLines = lines;
    scriptureWordTotals = [0];

    for (const line of scriptureLines) {
      scriptureWordTotals.push(
        scriptureWordTotals[scriptureWordTotals.length - 1] +
          line.split(/\s+/).filter((word) => /[\p{L}\p{N}]/u.test(word)).length,
      );
    }

    bookProgress = Math.min(bookProgress, scriptureLines.length);

    $("#friends").disabled = false;
    menuStates.clear();
    reset();
    if (document.body.classList.contains("reading-mode")) window.readingView.open();
    else if (currentMenu === "collaborative") window.collaborativeJourneys.refreshTyping();
    else input.focus();
  })
  .catch((error) => {
    $("#counter").textContent = `Scripture unavailable: ${error.message}. Reload to try again.`;

    console.error(error);
  });

let historySearchQuery = "";
let historyDateFrom = "";
let historyDateTo = "";
function historyResultDate(result) {
  // Date-only legacy results have no recorded time; interpret them at local midnight.
  return new Date(/^\d{4}-\d{2}-\d{2}$/.test(result.date) ? result.date + "T00:00:00" : result.date);
}
function historyJoinedDate() {
  let earliest = null;
  for (const result of history) {
    const date = historyResultDate(result);
    if (Number.isFinite(date.getTime()) && (!earliest || date < earliest)) earliest = date;
  }
  return earliest;
}
function profileJoinedLabel() {
  const date = historyJoinedDate();
  return date ? "date joined: " + date.toLocaleDateString() : "date joined: complete your first typing test";
}
function historyWithinDateRange(result) {
  if (!historyDateFrom && !historyDateTo) return true;
  const from = historyDateFrom ? new Date(historyDateFrom).getTime() : -Infinity;
  const to = historyDateTo ? new Date(historyDateTo).getTime() : Infinity;
  const time = historyResultDate(result).getTime();
  return Number.isFinite(time) && time >= from && time <= to;
}
function updateHistoryDateRange() {
  $("#historyDateStatus").textContent = historyDateFrom && historyDateTo && historyDateFrom > historyDateTo
    ? "The from date and time must be on or before the through date and time."
    : historyDateFrom || historyDateTo ? "Date range applies only to the progression chart. Results with unreadable dates are excluded." : "Showing all dates and times.";
  $("#historyProgressionChart").innerHTML = renderHistoryProgressionChart();
}
document.addEventListener("input", event => {
  if (event.target.id === "historyDateFrom") historyDateFrom = event.target.value;
  else if (event.target.id === "historyDateTo") historyDateTo = event.target.value;
  else return;
  updateHistoryDateRange();
});
document.addEventListener("click", event => {
  if (!event.target.closest("#historyDateClear")) return;
  historyDateFrom = historyDateTo = "";
  $("#historyDateFrom").value = $("#historyDateTo").value = "";
  updateHistoryDateRange();
});
let historyProgressionFormat = null;
let historyProgressionSettings = "all";
let historyProgressionBand = "all";
let historyProgressionPercent = 25;
function progressionFormat(result) {
  if (result.mode === "time" || result.mode === "words") return result.mode + ":" + result.limit;
  if (result.mode === "custom") return result.customPreset === "default" ? "custom:default" : "custom";
  return result.mode;
}
function progressionFormatLabel(value) {
  const [format, length] = value.split(":");
  if (format === "time") return length + " seconds";
  if (format === "words") return length + " words";
  return ({ book: "Scripture Journey", quote: "verse", custom: length === "default" ? "default custom text" : "custom text" })[format] || format;
}
document.addEventListener("click", event => {
  const button = event.target.closest("[data-progression-format], [data-progression-settings], [data-progression-band]");
  if (!button) return;
  const key = button.hasAttribute("data-progression-format") ? "progressionFormat" : button.hasAttribute("data-progression-settings") ? "progressionSettings" : "progressionBand";
  if (key === "progressionFormat") historyProgressionFormat = button.dataset[key];
  else if (key === "progressionSettings") historyProgressionSettings = button.dataset[key];
  else historyProgressionBand = button.dataset[key];
  const attribute = { progressionFormat: "data-progression-format", progressionSettings: "data-progression-settings", progressionBand: "data-progression-band" }[key];
  document.querySelectorAll("[" + attribute + "]").forEach(option => {
    option.setAttribute("aria-pressed", String(option === button));
  });
  $("#historyProgressionChart").innerHTML = renderHistoryProgressionChart();
});

document.addEventListener("input", event => {
  if (event.target.id !== "historyProgressionPercent") return;
  const percent = Number(event.target.value);
  if (!Number.isInteger(percent) || percent < 1 || percent > 100) {
    $("#historyPercentStatus").textContent = "Enter a whole percentage from 1 to 100. The chart keeps the last valid value.";
    return;
  }
  historyProgressionPercent = percent;
  $("#historyPercentStatus").textContent = "";
  $("#historyProgressionChart").innerHTML = renderHistoryProgressionChart();
});
function progressionPercentileEntries(entries) {
  if (historyProgressionBand === "all" || !entries.length) return entries;
  const count = Math.max(1, Math.ceil(entries.length * historyProgressionPercent / 100));
  const ranked = entries.map((entry, order) => ({ entry, order })).sort((a, b) =>
    a.entry.result.wpm - b.entry.result.wpm || a.order - b.order);
  const start = historyProgressionBand === "top" ? entries.length - count
    : historyProgressionBand === "middle" ? Math.floor((entries.length - count) / 2) : 0;
  const selected = new Set(ranked.slice(start, start + count).map(({ entry }) => entry.index));
  return entries.filter(entry => selected.has(entry.index));
}

function historyDescription(result) {
  return `${result.date} · ${result.reference || (result.mode === "quote" ? "verse" : result.mode) + " " + result.limit}${result.journey ? " · " + (result.collaborationId ? "collaboration: " : "") + result.journey : ""} · ${result.wpm} wpm · ${result.accuracy}% accuracy`;
}
function renderHistorySearch() {
  const terms = historySearchQuery.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const matches = history.map((result, index) => ({ result, index })).filter(({ result }) => {
    const text = (historyDescription(result) + " " + result.mode + " " +
      (result.capitalization === true ? "caps and punctuation" : result.capitalization === false ? "no caps or punctuation" : "")).toLowerCase();
    return terms.every(term => text.includes(term));
  });
  $("#historyCount").textContent = `${matches.length} of ${history.length} results`;
  if ($("#historyStorageNotice")) $("#historyStorageNotice").textContent = historyStorageMessage;
  $("#historyResults").innerHTML = matches.length ? matches.map(({ result, index }) =>
    `<button type="button" class="history-row" data-history-index="${index}">${escapeHtml(historyDescription(result))} ↗</button>`
  ).join("") : "<p>" + (history.length ? "No matching results." : "Finish a test to save your first result here.") + "</p>";
}
function focusLatestHistoryResult() {
  const buttons = [...document.querySelectorAll('#historyResults [data-history-index]')];
  let latest = buttons[0], latestTime = -Infinity;
  for (const button of buttons) {
    const result = history[Number(button.dataset.historyIndex)];
    const time = result ? historyResultDate(result).getTime() : NaN;
    if (Number.isFinite(time) && time > latestTime) { latest = button; latestTime = time; }
  }
  if (latest) { latest.focus(); latest.scrollIntoView({ block: 'nearest' }); }
}
document.addEventListener("input", event => {
  if (event.target.id !== "historySearch") return;
  historySearchQuery = event.target.value;
  renderHistorySearch();
});
function renderHistoryProgression() {
  if (historyProgressionFormat === null) historyProgressionFormat = progressionFormat({ mode, limit,
    customPreset: mode === "custom" && rawTarget === defaultCustomText ? "default" : undefined });
  const formats = ["book", "quote", "custom:default",
    ...[15, 30, 60, 120].map(value => "time:" + value),
    ...[10, 25, 50, 100].map(value => "words:" + value)];
  if (!formats.includes(historyProgressionFormat)) {
    historyProgressionFormat = mode === "time" ? "time:15" : mode === "words" ? "words:25" : "custom:default";
  }
  const settings = [["all", "all", "all settings (including older results)"],
    ["off", "caps off", "no caps or punctuation"], ["on", "caps on", "caps and punctuation"]];
  const formatGroups = [formats.slice(0, 3), formats.slice(3, 7), formats.slice(7)];
  const formatRows = formatGroups.map(group => '<tr>' + group.map(format =>
    '<td><button type="button" data-progression-format="' + escapeHtml(format) + '" aria-pressed="' +
    (format === historyProgressionFormat) + '">' + escapeHtml(progressionFormatLabel(format)) + '</button></td>'
  ).join("") + (group.length === 3 ? '<td></td>' : '') + '</tr>');
  return '<h3>history progression</h3><div class="progression-table-wrap"><table class="records-table progression-options"><caption>typing format</caption><tbody>' +
    formatRows.join("") + '</tbody></table></div>' +
    '<div class="progression-table-wrap"><table class="records-table progression-options"><caption>capitalization and punctuation</caption><tbody><tr>' +
    settings.map(([value, label, description]) => '<td><button type="button" data-progression-settings="' + value +
      '" aria-label="' + description + '" aria-pressed="' + (value === historyProgressionSettings) + '">' + label + '</button></td>').join("") +
    '</tr></tbody></table></div><div class="progression-table-wrap"><table class="records-table progression-options"><caption>WPM range</caption><tbody><tr>' +
    ["all", "top", "middle", "bottom"].map(value => '<td><button type="button" data-progression-band="' + value + '" aria-pressed="' + (value === historyProgressionBand) + '">' + value + '</button></td>').join("") +
    '</tr></tbody></table></div><label for="historyProgressionPercent">percentage of matching results</label><input class="race-field" id="historyProgressionPercent" type="number" min="1" max="100" step="1" value="' + historyProgressionPercent + '"><p id="historyPercentStatus" role="status" aria-live="polite"></p><div id="historyProgressionChart" aria-live="polite">' + renderHistoryProgressionChart() + '</div>' +
    '<div class="history-date-range"><div><label for="historyDateFrom">from date and time</label><input class="race-field" id="historyDateFrom" type="datetime-local" step="1"></div><div><label for="historyDateTo">through date and time</label><input class="race-field" id="historyDateTo" type="datetime-local" step="1"></div></div><button class="option" id="historyDateClear" type="button">reset date filter</button><p id="historyDateStatus" role="status" aria-live="polite"></p>';

}
function expandProgressionPoint(point) {
  hideProgressionPoint();
  openHistoryResult(Number(point.dataset.progressionIndex));
  $("#historyBack").focus();
}
document.addEventListener("click", event => {
  const point = event.target.closest("[data-progression-index]");
  if (point) expandProgressionPoint(point);
});
document.addEventListener("keydown", event => {
  if (event.key !== "Enter" && event.key !== " ") return;
  const point = event.target.closest("[data-progression-index]");
  if (!point) return;
  event.preventDefault();
  expandProgressionPoint(point);
});
function showProgressionPoint(point, event) {
  const tooltip = $("#progressionTooltip");
  const result = history[Number(point.dataset.progressionIndex)];
  if (!tooltip || !result) return;
  const date = historyResultDate(result);
  const readableDate = Number.isFinite(date.getTime());
  const rows = [
    ["date", readableDate ? date.toLocaleDateString() : result.date || "unknown"],
    ["time", readableDate && !/^\d{4}-\d{2}-\d{2}$/.test(result.date) ? date.toLocaleTimeString() : "not recorded"],
    ["speed", result.wpm + " WPM"],
    ["accuracy", result.accuracy + "%"],
  ];
  tooltip.innerHTML = '<dl>' + rows.map(([label, value]) =>
    '<div><dt>' + escapeHtml(label) + '</dt><dd>' + escapeHtml(value) + '</dd></div>'
  ).join("") + '</dl>';
  tooltip.hidden = false;
  document.querySelectorAll(".progression-point.is-active").forEach(active => {
    if (active !== point) active.classList.remove("is-active");
  });
  point.classList.add("is-active");
  const container = tooltip.parentElement.getBoundingClientRect();
  const rect = point.getBoundingClientRect();
  const pointer = event && event.type.startsWith("pointer");
  const cursorX = pointer ? event.clientX : rect.left + rect.width / 2;
  const cursorY = pointer ? event.clientY : rect.top + rect.height / 2;
  const modal = $("#modal").getBoundingClientRect();
  const bounds = { left: Math.max(0, modal.left) + 8, right: Math.min(innerWidth, modal.right) - 8,
    top: Math.max(0, modal.top) + 8, bottom: Math.min(innerHeight, modal.bottom) - 8 };
  let left = cursorX + 14, top = cursorY + 14;
  if (left + tooltip.offsetWidth > bounds.right) left = cursorX - tooltip.offsetWidth - 14;
  if (top + tooltip.offsetHeight > bounds.bottom) top = cursorY - tooltip.offsetHeight - 14;
  left = Math.max(bounds.left, Math.min(bounds.right - tooltip.offsetWidth, left));
  top = Math.max(bounds.top, Math.min(bounds.bottom - tooltip.offsetHeight, top));
  tooltip.style.left = left - container.left + "px";
  tooltip.style.top = top - container.top + "px";
}
function hideProgressionPoint() {
  const tooltip = $("#progressionTooltip");
  if (tooltip) tooltip.hidden = true;
  document.querySelectorAll(".progression-point.is-active").forEach(point => point.classList.remove("is-active"));
}
["pointerover", "pointermove", "focusin", "pointerdown"].forEach(type => document.addEventListener(type, event => {
  const point = event.target.closest("[data-progression-index]");
  if (point) showProgressionPoint(point, event);
  else if (type === "pointerdown") hideProgressionPoint();
}));
["pointerout", "focusout"].forEach(type => document.addEventListener(type, event => {
  const point = event.target.closest("[data-progression-index]");
  if (point && !point.contains(event.relatedTarget)) hideProgressionPoint();
}));
window.addEventListener("resize", hideProgressionPoint);
window.addEventListener("blur", hideProgressionPoint);
document.addEventListener("scroll", hideProgressionPoint, true);

function renderHistoryProgressionChart() {
  let entries = history.map((result, index) => ({ result, index })).filter(({ result }) =>
    historyWithinDateRange(result) && progressionFormat(result) === historyProgressionFormat && Number.isFinite(result.wpm) &&
    (historyProgressionSettings === "all" || (result.capitalization === (historyProgressionSettings === "on") &&
      result.punctuation === (historyProgressionSettings === "on")))
  ).reverse();
  // Modern records have ISO dates; retain saved order for older, unparseable dates.
  entries.sort((a, b) => {
    const first = historyResultDate(a.result).getTime(), second = historyResultDate(b.result).getTime();
    return Number.isFinite(first) && Number.isFinite(second) ? first - second : 0;
  });
  const matchingCount = entries.length;
  entries = progressionPercentileEntries(entries);
  if (!entries.length) return '<p>No saved results match this typing format, settings, and date range.</p>';
  const max = entries.reduce((value, entry) => Math.max(value, entry.result.wpm), 100);
  const x = index => entries.length === 1 ? 310 : 45 + index / (entries.length - 1) * 535;
  const y = value => 165 - value / max * 140;
  const grid = Array.from({ length: 5 }, (_, index) => {
    const value = max * index / 4, py = y(value);
    return `<line x1="45" y1="${py}" x2="580" y2="${py}" stroke="var(--muted)" opacity=".25"/><text x="38" y="${py + 4}" text-anchor="end">${Math.round(value)}</text>`;
  }).join("");
  const points = entries.map((entry, index) => `${x(index)},${y(entry.result.wpm)}`).join(" ");
  const dots = entries.map((entry, index) => `<g class="progression-point" data-progression-index="${entry.index}" tabindex="0" role="button" aria-label="Open saved result: ${escapeHtml(historyDescription(entry.result) + ' · ' + progressionFormatLabel(progressionFormat(entry.result)))}" aria-describedby="progressionTooltip"><circle cx="${x(index)}" cy="${y(entry.result.wpm)}" r="10" fill="transparent"/><circle class="progression-halo" cx="${x(index)}" cy="${y(entry.result.wpm)}" r="11"/><circle class="progression-dot" cx="${x(index)}" cy="${y(entry.result.wpm)}" r="3" fill="var(--accent)"/></g>`).join("");
  const tickIndices = [...new Set([0, Math.floor((entries.length - 1) / 2), entries.length - 1])];
  const ticks = tickIndices.map(index => {
    const date = historyResultDate(entries[index].result);
    const readable = Number.isFinite(date.getTime());
    const dateLabel = readable ? date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "unknown date";
    const timeLabel = readable && !/^\d{4}-\d{2}-\d{2}$/.test(entries[index].result.date)
      ? date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "time not recorded";
    const px = x(index), anchor = entries.length === 1 ? "middle" : index === 0 ? "start" : index === entries.length - 1 ? "end" : "middle";
    return `<line x1="${px}" y1="165" x2="${px}" y2="173" stroke="var(--muted)"/><text x="${px}" y="190" text-anchor="${anchor}">${escapeHtml(dateLabel)}</text><text x="${px}" y="206" text-anchor="${anchor}">${escapeHtml(timeLabel)}</text>`;
  }).join("");
  return '<p>WPM across ' + entries.length + ' of ' + matchingCount + ' matching results' + (historyProgressionBand === 'all' ? '' : ' · ' + historyProgressionBand + ' ' + historyProgressionPercent + '% by WPM') + ' for ' + escapeHtml(progressionFormatLabel(historyProgressionFormat)) + ', from oldest to newest. Each point is one result. Search filters only the list below.</p>' +
    `<div class="progression-plot"><svg class="history-progression" viewBox="0 0 600 220" role="group" aria-label="Typing speed progression across ${entries.length} results, oldest to newest. First result ${entries[0].result.wpm} WPM; latest result ${entries[entries.length - 1].result.wpm} WPM."><text x="4" y="13">WPM</text>${grid}<polyline points="${points}" fill="none" stroke="var(--accent)" stroke-width="2"/>${dots}${ticks}</svg><div id="progressionTooltip" class="progression-tooltip" role="tooltip" hidden></div></div>`;
}

function openHistoryResult(index) {
  const result = history[index];
  if (!result) return;
  const content = $("#modalContent");
  content.innerHTML =
    '<button id="historyBack" class="option">← typing history</button><h2>typing result</h2><p id="historyResultSummary"></p>';
  $("#historyResultSummary").textContent =
    `${result.date} · ${result.reference || (result.mode === "quote" ? "verse" : result.mode) + " " + result.limit} · ${result.wpm} wpm · ${result.accuracy}% accuracy`;
  const attemptActions = (result.raceReplay ? '<button class="option" data-race-replay-index="' + index + '">▶ replay all ' + (result.raceReplay.relay ? 'lanes' : 'racers') + '</button>' : "") + (result.replay
    ? '<div class="records-controls"><button class="option" data-replay-index="' + index + '">▶ replay</button><button class="option" data-retry-index="' + index + '">↻ retry</button><button class="option" data-race-against-index="' + index + '">⚑ race against</button></div>'
    : '<p>Replay, retry, and race against are unavailable because this older result has no saved passage or keystroke timing.</p>');
  if (!result.chart) {
    content.insertAdjacentHTML(
      "beforeend",
      "<p>Chart data was not saved for this older result. New results include a chart.</p>" + attemptActions,
    );
    return;
  }
  const chartData = visibleChartData(result.chart);
  if (!chartData.sampleTimes.length) {
    content.insertAdjacentHTML("beforeend", "<p>No chart readings at or after one second for this attempt.</p>" + attemptActions);
    return;
  }
  content.insertAdjacentHTML(
    "beforeend",
    chartLegend('historyChart') + '<div class="chart-wrap"><canvas id="historyChart" aria-label="Saved typing speed and mistakes over time"></canvas><div id="historyChartMarker" class="chart-marker" aria-hidden="true" hidden></div></div><p id="historyChartPoint" aria-live="polite">Move over the chart to inspect typing speed.</p>' + attemptActions,
  );
  const canvas = $("#historyChart");
  canvas._chartData = chartData;
  drawChart(canvas, chartData);
  const marker = $("#historyChartMarker");
  const hideMarker = () => { marker.hidden = true; };
  canvas.addEventListener("pointerleave", hideMarker);
  canvas.addEventListener("pointercancel", hideMarker);
  canvas.addEventListener("pointermove", (event) => {
    const times = chartData.sampleTimes;
    if (!times.length) { hideMarker(); return; }
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 40) { hideMarker(); return; }
    const range = chartTimeRange(times),
      time = range.start + Math.max(0, Math.min(1, (event.clientX - rect.left - 35) / (rect.width - 40))) * range.span;
    if (time < times[0]) {
      hideMarker();
      $("#historyChartPoint").textContent = "Chart readings begin after one second and at least two characters.";
      return;
    }
    let closest = 0;
    for (let i = 1; i < times.length; i++) if (Math.abs(times[i] - time) < Math.abs(times[closest] - time)) closest = i;
    marker.style.left = 35 + (times[closest] - range.start) / range.span * (rect.width - 40) + "px";
    marker.hidden = false;
    $("#historyChartPoint").textContent =
      `${times[closest].toFixed(2)}s · average ${chartData.samples[closest]} wpm · instant ${chartData.instantSamples[closest]} wpm · raw ${chartData.rawSamples[closest]} wpm`;
  });
}

function newPersonalRecord(result, previous = history) {
  if (window.friendRace?.active) return "";
  const category = personalRecordCategories().find(category => category.matches(result));
  if (!category || !Number.isFinite(result.wpm) || result.wpm <= 0) return "";
  const beats = entries => entries.every(item => !Number.isFinite(item.wpm) || result.wpm > item.wpm);
  const entries = previous.filter(item => category.matches(item));
  if (beats(entries)) return `New personal record · ${category.label} · overall`;
  const matching = entries.filter(item => item.capitalization === result.capitalization && item.punctuation === result.punctuation);
  return beats(matching) ? `New personal record · ${category.label} · caps and punctuation ${result.capitalization ? "on" : "off"}` : "";
}
function personalRecordCategories() {
  return [
    { label: "verse", matches: (result) => !result.collaborationId && (result.mode === "quote" || result.mode === "book") },
    { label: "default custom text", matches: (result) => result.mode === "custom" && result.customPreset === "default" },
    ...[15, 30, 60, 120].map((limit) => ({
      label: limit + " seconds",
      matches: (result) => result.mode === "time" && result.limit === limit,
    })),
    ...[10, 25, 50, 100].map((limit) => ({
      label: limit + " words",
      matches: (result) => result.mode === "words" && result.limit === limit,
    })),
  ];
}
function renderPersonalRecords() {
  const categories = personalRecordCategories();
  const settings = [
    { label: "overall", short: "all", matches: () => true },
    { label: "no caps or punctuation", short: "caps off", matches: result => result.capitalization === false && result.punctuation === false },
    { label: "caps and punctuation", short: "caps on", matches: result => result.capitalization === true && result.punctuation === true },
  ];
  return '<h3>personal records</h3><table class="records-table personal-records"><thead><tr><th scope="col">test</th>' +
    settings.map(setting => '<th scope="col" aria-label="' + setting.label + '"><span class="record-full-label">' + setting.label + '</span><span class="record-short-label" aria-hidden="true">' + setting.short + '</span></th>').join('') +
    '</tr></thead><tbody>' + categories.map(category =>
      '<tr><th scope="row">' + category.label + '</th>' + settings.map(setting => {
        let best = -1;
        history.forEach((result, index) => {
          if (category.matches(result) && setting.matches(result) && Number.isFinite(result.wpm) &&
              (best < 0 || result.wpm > history[best].wpm)) best = index;
        });
        const result = history[best];
        return '<td>' + (result
          ? '<button type="button" data-history-index="' + best + '" aria-label="View ' +
            escapeHtml(category.label + ' ' + setting.label) + ' record: ' + result.wpm + ' wpm">' + result.wpm + ' wpm ↗</button>'
          : '<span aria-label="No completed result">—</span>') + '</td>';
      }).join('') + '</tr>'
    ).join('') + '</tbody></table>';
}

function openReadingPage() {
  if (currentMenu !== "reading") pauseMenu();
  currentMenu = "reading";
  setReadingView(true);
  syncNavigation();
  window.readingView.open();
}

function openMenuDestination() {
  if (location.hash === "#collaborative") $("#collaborative").click();
  if (location.hash === "#reading") $("#readJourney").click();
  if (location.hash === "#journey") enterBook();
  if (location.hash === "#typing") enterTyping();
  if (location.hash === "#friends") $("#friends").click();
  if (location.hash === "#records") openModal("records");
  if (location.hash === "#history") openModal("history");
  if (location.hash === "#settings") openModal("settings");
}
window.addEventListener("load", openMenuDestination);
window.addEventListener("hashchange", openMenuDestination);
