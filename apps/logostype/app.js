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
function journeyPosition() {
  const journey = currentJourney();
  return journey.start + journey.progress;
}
function saveBookJourneys() {
  try {
    localStorage.setItem("logostype-book-journeys", JSON.stringify(bookJourneys));
  } catch {}
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
  const seconds = Math.floor(attempts.reduce((sum, item) => sum + (item.typingMs ?? 0), 0) / 1000);
  const format = (seconds) => `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m ${seconds % 60}s`;
  const allSeconds = Math.floor(attempts.reduce((sum, item) => sum + (item.elapsedMs ?? item.typingMs ?? 0), 0) / 1000);
  return `Time spent typing (successful attempts): ${format(seconds)} · Total time spent (all attempts): ${format(allSeconds)}`;
}
function celebrateJourney(colorCount = 1) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const canvas = document.createElement("canvas");
  canvas.setAttribute("aria-hidden", "true");
  canvas.style.cssText = "position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:1000";
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  const context = canvas.getContext("2d");
  if (!context) return;
  document.body.append(canvas);
  const colors = ["#e2b714", "#88c0d0", "#ebbcba", "#a3be8c", "#f5f5f5", "#e67e50", "#e65d80"].slice(0, colorCount);
  const pieces = Array.from({ length: 160 }, (_, index) => ({
    x: Math.random() * canvas.width,
    y: -20 - Math.random() * canvas.height * 0.5,
    vx: (Math.random() - 0.5) * 180,
    vy: 100 + Math.random() * 180,
    angle: Math.random() * Math.PI,
    spin: (Math.random() - 0.5) * 8,
    color: colors[index % colors.length],
  }));
  let started, last;
  function frame(now) {
    started ??= now;
    const delta = Math.min((now - (last ?? now)) / 1000, 0.05);
    last = now;
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.globalAlpha = Math.min(1, (4500 - (now - started)) / 800);
    for (const piece of pieces) {
      piece.x += piece.vx * delta;
      piece.y += piece.vy * delta;
      piece.vy += 70 * delta;
      piece.angle += piece.spin * delta;
      context.save();
      context.translate(piece.x, piece.y);
      context.rotate(piece.angle);
      context.fillStyle = piece.color;
      context.fillRect(-4, -6, 8, 12);
      context.restore();
    }
    if (now - started < 4500) requestAnimationFrame(frame);
    else canvas.remove();
  }
  requestAnimationFrame(frame);
}
function setReadingView(active) {
  document.body.classList.toggle("reading-mode", active);
  $("#typingContent").hidden = active;
  $("#readingContent").hidden = !active;
}
function syncNavigation(racing = false) {
  const reading = document.body.classList.contains("reading-mode") && !racing;
  if (racing) setReadingView(false);
  $("#readJourney").classList.toggle("active", reading);
  $("#home").classList.toggle("active", !racing && !reading && mode !== "book");
  $("#book").classList.toggle("active", !racing && !reading && mode === "book");
  $("#friends").classList.toggle("active", racing);
}
function updateBookProgress(message = "") {
  const active = mode === "book" && !window.friendRace?.active;
  document.body.classList.toggle("book-mode", active);
  $("#bookProgress").hidden = !active;
  $("#journeyProgress").hidden = !active;
  $("#journeyOptions").hidden = !active;
  $("#journeyLocalProgress").hidden = !active;
  if (!active) {
    $("#restart").title = "Restart test";
    $("#restart").setAttribute("aria-label", "Restart test");
    return;
  }
  const journey = currentJourney(),
    size = journey.end - journey.start;
  const completed = Math.min(journey.progress, size),
    position = journey.start + completed;
  const completedWords = (scriptureWordTotals[position] || 0) - (scriptureWordTotals[journey.start] || 0);
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
        ? chapters.filter((end) => end <= position).length
        : Math.max(0, Math.min(position, rangeEnd) - rangeStart);
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

  $("#journeyLabel").textContent = selectedJourneyBook || "scriptures";
  $("#chooseJourney").textContent = (selectedJourneyBook || "entire Scriptures") + " ▦";
  $("#journeyProgressFill").style.height = percent + "%";
  $("#journeyProgressValue").textContent = percent.toFixed(2) + "%";
  $("#journeyProgressCount").textContent = `${completedWords.toLocaleString()} / ${totalWords.toLocaleString()} words`;
  $("#journeyBookCount").textContent = selectedJourneyBook
    ? `${completed === size ? 1 : 0} / 1 books`
    : `${scriptureBookEnds.filter((end) => end <= position).length} / ${scriptureBookEnds.length} books`;
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
  const completedAt = selectedJourneyBook ? journey.completions.at(-1) : journeyCompletedAt;
  if (finished && completedAt)
    $("#bookProgress").textContent += ` Completed on ${new Date(completedAt).toLocaleString()}.`;
  if (finished) $("#bookProgress").textContent += " " + journeyTypingStats();
  $("#restart").disabled = false;
  $("#restart").title = finished ? `Start a new ${journey.name} journey` : "Restart verse";
  $("#restart").setAttribute("aria-label", $("#restart").title);
}

function restartTest() {
  const journey = currentJourney();
  if (mode === "book" && selectedJourneyBook && journey.progress === journey.end - journey.start) {
    bookJourneys[selectedJourneyBook] = { progress: 0, completions: journey.completions };
    saveBookJourneys();
  } else if (
    mode === "book" &&
    scriptureLines.length &&
    bookProgress >= scriptureLines.length &&
    !selectedJourneyBook
  ) {
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
    if (element.hidden) continue;
    element.querySelector(".verse-context-reference").textContent = scriptureReferences[index];
    element.querySelector("p").textContent = scriptureLines[index];
  }
}
function enterBook() {
  setReadingView(false);
  if (mode !== "book") lastTypingMode = mode;
  mode = "book";
  reset();
  input.focus();
}
function enterTyping() {
  setReadingView(false);
  if (mode === "book") {
    mode = lastTypingMode;
    limit = mode === "time" ? 15 : 25;
  }
  $("#modes")
    .querySelectorAll("button")
    .forEach((b) => b.classList.toggle("active", b.dataset.mode === mode));
  reset();
  input.focus();
}
function completeBookVerse() {
  if (mode !== "book") return;
  const previousPosition = journeyPosition();
  const passed = typed === target && target.length > 0;
  if (passed) {
    if (!done) sampleWpm();
    if (activeJourneyAttempt) {
      checkpointJourneyAttempt();
      activeJourneyAttempt.typingMs = activeJourneyAttempt.elapsedMs;
      saveJourneyAttempts();
      activeJourneyAttempt = null;
    }
    const result = {
      id: crypto.randomUUID?.() || Date.now().toString(36) + Math.random().toString(36).slice(2),
      wpm: speed(),
      rawWpm: rawSpeed(),
      accuracy: total ? Math.round(((total - errors) / total) * 100) : 100,
      mode: "book",
      limit: 1,
      date: new Date().toLocaleDateString(),
      reference: scriptureReferences[journeyPosition()],
      journey: selectedJourneyBook || "Entire Scriptures",
      chart: captureChart(),
    };
    history.unshift(result);
    try {
      localStorage.setItem("logostype-history", JSON.stringify(history));
    } catch {}
  }

  if (passed && selectedJourneyBook) {
    const journey = currentJourney(),
      size = journey.end - journey.start;
    if (journey.progress < size) {
      const state = { progress: journey.progress + 1, completions: [...journey.completions] };
      if (state.progress === size) {
        state.completions.push(new Date().toISOString());
      }
      bookJourneys[selectedJourneyBook] = state;
      saveBookJourneys();
    }
  } else if (passed && bookProgress < scriptureLines.length) {
    bookProgress = Math.min(bookProgress + 1, scriptureLines.length);
    try {
      localStorage.setItem("logostype-book-progress", String(bookProgress));
    } catch {}
    if (bookProgress === scriptureLines.length) {
      journeyCompletedAt = new Date().toISOString();
      journeyCompletions.push(journeyCompletedAt);
      try {
        localStorage.setItem("logostype-journey-completed-at", journeyCompletedAt);
        localStorage.setItem("logostype-journey-completions", JSON.stringify(journeyCompletions));
      } catch {}
    }
  }
  const position = journeyPosition();
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
  recentCorrect = [],
  custom =
    "And when he sits on the throne of his kingdom, he shall write out for himself a copy of this law in a book, out of [that which is] before the Levitical priests.",
  history = [];
try {
  history = JSON.parse(localStorage.getItem("logostype-history") || "[]");
} catch {}
const input = $("#typing");
function limits() {
  const values = mode === "time" ? [15, 30, 60, 120] : [10, 25, 50, 100];
  $("#limits").innerHTML =
    mode === "quote" || mode === "custom" || mode === "book"
      ? ""
      : values.map((n) => `<button data-limit="${n}" class="${n === limit ? "active" : ""}">${n}</button>`).join("") +
        (mode === "time"
          ? `<button data-duration class="${values.includes(limit) ? "" : "active"}" aria-label="Custom time duration">${values.includes(limit) ? "custom" : limit + "s ✎"}</button>`
          : "");
}
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
  return normalizeScripture(passage);
}
let lastInput = "";
function parseTyping(value, capped = false) {
  let text = "",
    raw = "";
  const expected = [];
  for (const character of value.split("")) {
    if (capped && text.length >= target.length) break;
    raw += character;
    expected.push(target[text.length]);
    text += character;
  }
  return { text, raw, expected };
}
function render(smooth = true) {
  renderBookContext();
  let pos = 0;
  $("#words").innerHTML = target
    .split(" ")
    .map((w) => {
      let html = '<span class="word">';
      for (const c of w) {
        const isTyped = pos < typed.length;
        const wrong = isTyped && typed[pos] !== c;
        const cursor = pos === typed.length ? " cursor" : "";
        let state = "";
        let content = c;
        if (isTyped) {
          if (wrong) {
            if (c !== " ") {
              // Corrupted a letter: show the correct letter in red, not the wrong char
              state = "incorrect";
              content = c;
            } else {
              // Corrupted a space: show the wrong character in ghost
              state = "incorrect";
              content = typed[pos];
            }
          } else {
            state = "correct";
            content = typed[pos];
          }
        }
        html += `<span class="letter ${state}${cursor}">${escapeHtml(content)}</span>`;
        pos++;
      }
      // Word separator: this target slot is a space
      if (pos === typed.length) {
        html += `<span class="letter cursor"> </span></span>`;
      } else if (pos < typed.length) {
        const state = typed[pos] === " " ? "correct" : "incorrect";
        const ghost = state === "incorrect" ? " ghost-space" : "";
        const content = state === "incorrect" ? typed[pos] : " ";
        html += `<span class="letter ${state}${ghost}">${escapeHtml(content)}</span></span>`;
      } else {
        html += `<span class="letter"> </span></span>`;
      }
      pos++;
      return html;
    })
    .join("");
  positionCaret(smooth);
}
function positionCaret(smooth = true) {
  const letter = $(".cursor"),
    caret = $("#typingCaret");
  caret.hidden = !letter;
  if (!letter) return;
  const box = $("#words");
  const lineHeight = parseFloat(getComputedStyle(box).lineHeight);
  box.scrollTop = document.body.classList.contains("book-mode")
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
function speed() {
  let correct = 0;
  for (let i = 0; i < typed.length; i++) if (typed[i] === target[i]) correct++;
  return Math.round(correct / 5 / Math.max((Date.now() - start) / 60000, 1 / 60));
}
function rawSpeed() {
  if (!start) return 0;
  return Math.round(input.value.length / 5 / Math.max((Date.now() - start) / 60000, 1 / 60));
}
function instantSpeed(now = Date.now()) {
  recentCorrect = recentCorrect.filter((hit) => now - hit.time < 3000);
  if (!start) return 0;
  return Math.round((recentCorrect.length / 5 / Math.max(1, Math.min(3, (now - start) / 1000))) * 60);
}
function recordMistake() {
  errors++;
  mistakeEvents.push({ time: Math.max(0, (Date.now() - start) / 1000), wpm: instantSpeed() });
}
function sampleWpm() {
  samples.push(speed());
  instantSamples.push(instantSpeed());
  rawSamples.push(rawSpeed());
  sampleTimes.push(Math.max(0, (Date.now() - start) / 1000));
}
function finish() {
  if (done) return;
  sampleWpm();
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
  $("#testType").textContent = `${mode} ${mode === "time" ? limit + "s" : mode === "words" ? limit : ""} · english`;
  $("#resultDetails").textContent = `${Math.round(elapsed)}s · ${typed.length} characters · ${errors} errors`;
  $("#testSection").style.display = "none";
  $("#results").style.display = "block";
  history.unshift({
    id: crypto.randomUUID?.() || Date.now().toString(36) + Math.random().toString(36).slice(2),
    wpm,
    rawWpm: rawSpeed(),
    accuracy,
    mode,
    limit,
    date: new Date().toLocaleDateString(),
    chart: captureChart(),
  });
  try {
    localStorage.setItem("logostype-history", JSON.stringify(history));
  } catch {}
  window.friendRace?.report(true);
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
function drawChart(c = $("#chart"), data = captureChart()) {
  if (c.id === "chart") hideChartHover();
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
  const duration = Math.max(1, ...sampleTimes);
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
  for (const [values, color, dash] of [
    [rawSamples, "--muted", [2, 4]],
    [instantSamples, "--text", [5, 4]],
    [samples, "--accent", []],
  ]) {
    x.strokeStyle = styles.getPropertyValue(color);
    x.lineWidth = 2;
    x.setLineDash(dash);
    x.beginPath();
    x.moveTo(35, 145);
    values.forEach((v, i) => x.lineTo(35 + (sampleTimes[i] / duration) * (w - 40), 145 - (v / max) * 130));
    x.stroke();
  }
  x.setLineDash([]);
  x.strokeStyle = styles.getPropertyValue("--error");
  x.lineWidth = 2;
  for (const event of mistakeEvents) {
    const px = 35 + Math.min(event.time / duration, 1) * (w - 40);
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
  if (!sampleTimes.length || width <= 40) return null;
  const x = Math.max(35, Math.min(width - 5, pointerX));
  const time = ((x - 35) / (width - 40)) * Math.max(1, ...sampleTimes);
  let index = 0;
  for (let i = 1; i < sampleTimes.length; i++)
    if (Math.abs(sampleTimes[i] - time) < Math.abs(sampleTimes[index] - time)) index = i;
  return { x, index };
}
$("#chart").addEventListener("pointermove", (event) => {
  const chart = $("#chart");
  if (chart.hidden || !done) {
    hideChartHover();
    return;
  }
  const rect = chart.getBoundingClientRect();
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
  $("#chartHoverTime").textContent = sampleTimes[index].toFixed(1) + "s";
  $("#chartHoverAverage").textContent = samples[index];
  $("#chartHoverInstant").textContent = instantSamples[index];
  $("#chartHoverRaw").textContent = rawSamples[index];
  tooltip.hidden = false;
  const tooltipWidth = tooltip.offsetWidth;
  const left = x + 12 + tooltipWidth > rect.width ? x - tooltipWidth - 12 : x + 12;
  tooltip.style.left = Math.max(0, Math.min(rect.width - tooltipWidth, left)) + "px";
});
$("#chart").addEventListener("pointerleave", hideChartHover);
$("#chart").addEventListener("pointercancel", hideChartHover);
window.addEventListener("resize", () => {
  hideChartHover();
  if (done && !$("#chart").hidden) drawChart();
  const canvas = $("#historyChart");
  if (canvas && $("#modal").open && canvas._chartData) drawChart(canvas, canvas._chartData);
});
input.addEventListener("keydown", (event) => {
  if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) event.preventDefault();
});
input.addEventListener("beforeinput", (event) => {
  if (
    (mode === "book" || window.friendRace?.active) &&
    event.inputType.startsWith("insert") &&
    parseTyping(input.value).text.length >= target.length &&
    input.selectionStart === input.selectionEnd
  )
    event.preventDefault();
});
input.addEventListener("input", () => {
  if (done) {
    input.value = lastInput;
    return;
  }
  if (window.friendRace?.active && !window.friendRace.running) {
    input.value = lastInput;
    return;
  }
  if (mode === "book" && !window.friendRace?.active && !start && !lastInput.length)
    input.value = input.value.replace(/^ +/, "");
  const capped = mode === "book" || window.friendRace?.active;
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
    timer = setInterval(() => {
      const elapsed = (Date.now() - start) / 1000;
      if (activeJourneyAttempt && Math.floor(elapsed) > Math.floor((activeJourneyAttempt.elapsedMs || 0) / 1000)) {
        checkpointJourneyAttempt();
        updateBookProgress();
      }
      sampleWpm();
      $("#counter").textContent =
        mode === "time" ? Math.max(0, Math.ceil(limit - elapsed)) : `${typed.length}/${target.length}`;
      if (mode === "time" && elapsed >= limit) finish();
    }, 250);
  }
  for (let i = 0; i < parsed.raw.length; i++)
    if (i >= lastInput.length || parsed.raw[i] !== lastInput[i]) {
      total++;
      if (parsed.raw[i] !== parsed.expected[i]) recordMistake();
    }
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
    ((!window.friendRace?.active && mode !== "book") || typed === target)
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
  if (e.target.hasAttribute("data-duration")) {
    openModal("duration");
    return;
  }
  if (e.target.dataset.limit) {
    limit = +e.target.dataset.limit;
    reset();
  }
};
for (const [id, getValue, toggle] of [
  ["punct", () => punctuation, () => (punctuation = !punctuation)],
  ["capitalization", () => capitalization, () => (capitalization = !capitalization)],
]) {
  $("#" + id).onclick = () => {
    if (window.friendRace?.active || mode === "book") return;
    toggle();
    $("#" + id).classList.toggle("active", getValue());
    $("#" + id).setAttribute("aria-pressed", String(getValue()));
    reset(true);
  };
}
const themes = {
  "black on white": ["#ffffff", "#f5f5f5", "#000000", "#666666", "#000000"],
  "white on black": ["#000000", "#151515", "#ffffff", "#999999", "#ffffff"],
  typeracer: ["#eeeeee", "#ffffff", "#20588f", "#62676c", "#005894"],
  "serika dark": ["#323437", "#2c2e31", "#d1d0c5", "#646669", "#e2b714"],
  serika: ["#e1e1e3", "#d1d3d8", "#323437", "#aaaeb3", "#b68b00"],
  nord: ["#2e3440", "#272d38", "#d8dee9", "#6c7a90", "#88c0d0"],
  "rose pine": ["#191724", "#1f1d2e", "#e0def4", "#6e6a86", "#ebbcba"],
};
function theme(name) {
  const vals = themes[name] || themes["black on white"];
  const light = name === "black on white" || name === "serika" || name === "typeracer";
  document.documentElement.dataset.theme = name;
  document.documentElement.style.colorScheme = light ? "light" : "dark";
  document.documentElement.style.setProperty("--old-testament", light ? "#256579" : "#88c0d0");
  document.documentElement.style.setProperty("--new-testament", light ? "#734799" : "#c4a7e7");
  ["--bg", "--panel", "--text", "--muted", "--accent"].forEach((k, i) =>
    document.documentElement.style.setProperty(k, vals[i]),
  );
  $("#themeName").textContent = name;
  try {
    localStorage.setItem("logostype-theme", name);
  } catch {}
}
function openModal(type) {
  const content = $("#modalContent");
  if (type === "themes")
    content.innerHTML =
      "<h2>theme</h2>" +
      Object.keys(themes)
        .map((t) => `<button class="option" data-theme="${t}">◐ ${t}</button>`)
        .join("");
  if (type === "settings")
    content.innerHTML =
      '<h2>settings</h2><h3>your profile</h3><form id="profileForm"><label for="profileName">your name</label><input class="race-field" id="profileName" maxlength="24" placeholder="typist" autocomplete="nickname"><button class="option" type="submit">save name</button><p id="profileStatus" role="status" aria-live="polite"></p></form><button class="option" data-open="history">↗ records and typing history</button><button class="option" data-open="themes">◐ change theme</button><button class="option" id="fontSmaller" type="button">A− smaller font</button><button class="option" id="fontBigger" type="button">A+ bigger font</button><h3>your data</h3><button class="option" id="exportData">export progress and typing history ↓</button><button class="option" id="importData">import progress and typing history ↑</button><button class="option" id="clearData">clear saved data</button><p>Export a JSON backup of your name, Scripture Journey progress, and all saved typing history. Import merges history and keeps your furthest progress.</p><p id="dataStatus" role="status" aria-live="polite"></p><p>Tests begin on your first keystroke. Backspace corrects mistakes. Your name, theme, progress, and typing history are saved on this device.</p>';
  if (type === "about")
    content.innerHTML =
      "<h2>logostype</h2><p>Type the scriptures. No account required; your results stay in this browser.</p><p>Speed is measured in words per minute, using five characters per word. Accuracy includes all keystrokes, even corrected mistakes.</p>";
  if (type === "history" || type === "profile")
    content.innerHTML =
      '<button class="option" data-open="settings">← settings</button><h2>records and typing history</h2>' +
      renderPersonalRecords() +
      "<h3>typing history</h3>" +
      (history.length
        ? history
            .map(
              (h, index) =>
                `<button type="button" class="history-row" data-history-index="${index}" aria-label="View result: ${escapeHtml(h.reference || h.mode)} ${escapeHtml(h.date)}"><span>${escapeHtml(h.date)} · ${escapeHtml(h.reference || h.mode)} ${h.reference ? "" : h.limit}</span><span>${h.wpm} wpm · ${h.accuracy}% ↗</span></button>`,
            )
            .join("")
        : "<p>Your first personal best is one test away. Finish a test to save your results here.</p>");
  if (type === "history" || type === "profile")
    content.insertAdjacentHTML(
      "beforeend",
      "<h3>Scripture Journey completions</h3>" +
        (journeyCompletions.length
          ? "<ol>" +
            journeyCompletions
              .slice()
              .reverse()
              .map((date) => "<li>" + escapeHtml(new Date(date).toLocaleString()) + "</li>")
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
      '<h2>custom text</h2><textarea id="customText" aria-label="Custom typing text"></textarea><button class="option" id="saveCustom">start test →</button>';
  if (type === "duration")
    content.innerHTML =
      '<h2>custom duration</h2><form id="durationForm"><label for="durationSeconds">duration in seconds</label><input class="race-field" id="durationSeconds" type="number" min="1" max="3600" step="1" required><p>Choose 1–3600 seconds. The timer starts on your first keystroke.</p><button class="option" type="submit">apply duration →</button></form>';
  if (type === "commands")
    content.innerHTML =
      '<h2>command line</h2><button class="option" id="restartCommand">↻ restart test</button><button class="option" data-open="themes">◐ theme</button><button class="option" data-open="settings">⚙ settings</button><button class="option" data-open="history">♛ history</button>';
  if (type === "history" || type === "profile") {
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
                    "<li>" + escapeHtml(book.name) + " · " + escapeHtml(new Date(date).toLocaleString()) + "</li>",
                )
                .join(""),
            )
            .join("") +
          "</ul>",
      );
  }
  if (!$("#modal").open) $("#modal").showModal();
  if (type === "settings" || type === "profile") $("#profileName").value = getProfileName();
  if (type === "custom") $("#customText").value = custom;
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
  if (b.id === "saveCustom") {
    custom = $("#customText").value.trim() || custom;
    $("#modal").close();
    reset();
    input.focus();
  }
  if (b.id === "fontSmaller" || b.id === "fontBigger") {
    const words = $("#words");
    const size = parseFloat(getComputedStyle(words).fontSize);
    words.style.fontSize = Math.max(16, Math.min(64, size + (b.id === "fontBigger" ? 2 : -2))) + "px";
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
  if ($("#leaveRaceDialog").open || $("#clearDataDialog").open) return;
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
    if (!e.shiftKey && document.activeElement === input && !window.friendRace?.active) {
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
    !done &&
    !document.body.classList.contains("reading-mode") &&
    e.key.length === 1 &&
    !e.ctrlKey &&
    !e.metaKey &&
    document.activeElement !== input
  ) {
    input.focus();
  }
});
try {
  theme(localStorage.getItem("logostype-theme") || "black on white");
} catch {
  theme("black on white");
}
reset();
input.focus();

document.addEventListener("submit", (e) => {
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
  selectedJourneyBook = name;
  try {
    localStorage.setItem("logostype-selected-book", name);
  } catch {}
  reset();
  input.focus();
}
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
    reset();
    if (document.body.classList.contains("reading-mode")) window.readingView.open();
    else input.focus();
  })
  .catch((error) => {
    $("#counter").textContent = `Scripture unavailable: ${error.message}. Reload to try again.`;

    console.error(error);
  });

function openHistoryResult(index) {
  const result = history[index];
  if (!result) return;
  const content = $("#modalContent");
  content.innerHTML =
    '<button id="historyBack" class="option">← typing history</button><h2>typing result</h2><p id="historyResultSummary"></p>';
  $("#historyResultSummary").textContent =
    `${result.date} · ${result.reference || result.mode + " " + result.limit} · ${result.wpm} wpm · ${result.accuracy}% accuracy`;
  if (!result.chart) {
    content.insertAdjacentHTML(
      "beforeend",
      "<p>Chart data was not saved for this older result. New results include a chart.</p>",
    );
    return;
  }
  content.insertAdjacentHTML(
    "beforeend",
    '<div class="chart-legend"><span class="average-key">━ average wpm</span><span>┄ instant wpm</span><span class="raw-key">┈ raw wpm</span><span class="mistake-key">× mistakes</span></div><canvas id="historyChart" aria-label="Saved typing speed and mistakes over time"></canvas><p id="historyChartPoint" aria-live="polite">Move over the chart to inspect typing speed.</p>',
  );
  const canvas = $("#historyChart");
  canvas._chartData = result.chart;
  drawChart(canvas, result.chart);
  canvas.addEventListener("pointermove", (event) => {
    const times = result.chart.sampleTimes;
    if (!times.length) return;
    const rect = canvas.getBoundingClientRect(),
      time = Math.max(0, Math.min(1, (event.clientX - rect.left - 35) / (rect.width - 40))) * Math.max(1, ...times);
    let closest = 0;
    for (let i = 1; i < times.length; i++) if (Math.abs(times[i] - time) < Math.abs(times[closest] - time)) closest = i;
    $("#historyChartPoint").textContent =
      `${times[closest].toFixed(1)}s · average ${result.chart.samples[closest]} wpm · instant ${result.chart.instantSamples[closest]} wpm · raw ${result.chart.rawSamples[closest]} wpm`;
  });
}

function renderPersonalRecords() {
  const categories = [
    { label: "verse", matches: (result) => result.mode === "quote" || result.mode === "book" },
    ...[15, 30, 60, 120].map((limit) => ({
      label: limit + " seconds",
      matches: (result) => result.mode === "time" && result.limit === limit,
    })),
    ...[10, 25, 50, 100].map((limit) => ({
      label: limit + " words",
      matches: (result) => result.mode === "words" && result.limit === limit,
    })),
  ];
  return (
    '<h3>personal records</h3><table class="records-table"><thead><tr><th scope="col">test</th><th scope="col">fastest wpm</th></tr></thead><tbody>' +
    categories
      .map((category) => {
        let best = -1;
        history.forEach((result, index) => {
          if (category.matches(result) && Number.isFinite(result.wpm) && (best < 0 || result.wpm > history[best].wpm))
            best = index;
        });
        const result = history[best];
        return (
          '<tr><th scope="row">' +
          category.label +
          "</th><td>" +
          (result
            ? '<button type="button" data-history-index="' +
              best +
              '" aria-label="View ' +
              escapeHtml(category.label) +
              " record: " +
              result.wpm +
              ' wpm">' +
              result.wpm +
              " wpm ↗</button>"
            : '<span aria-label="No completed result">—</span>') +
          "</td></tr>"
        );
      })
      .join("") +
    "</tbody></table>"
  );
}

function openReadingPage() {
  reset();
  setReadingView(true);
  syncNavigation();
  window.readingView.open();
}

function openMenuDestination() {
  if (location.hash === "#reading") $("#readJourney").click();
  if (location.hash === "#journey") enterBook();
  if (location.hash === "#typing") enterTyping();
  if (location.hash === "#friends") $("#friends").click();
  if (location.hash === "#settings") openModal("settings");
}
window.addEventListener("load", openMenuDestination);
window.addEventListener("hashchange", openMenuDestination);
