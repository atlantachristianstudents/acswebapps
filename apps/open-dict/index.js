(() => {
  "use strict";
  const dictionary = window.OpenDictionary;
  const starter = dictionary.starterAdapter(window.OPEN_DICT_STARTER);
  const content = document.querySelector("#content");
  const search = document.querySelector("#search");
  const form = search.form;
  const suggestionList = document.querySelector("#suggestions");
  const filterFields = document.querySelector("#filters");
  const filterToggle = document.querySelector("#filter-toggle");
  const status = document.querySelector("#status");
  const positions = {
    adj:"adjective", adv:"adverb", noun:"noun", verb:"verb", name:"proper name", prep:"preposition",
    pron:"pronoun", conj:"conjunction", intj:"interjection", num:"numeral", det:"determiner"
  };
  const kinds = {exact:"Exact headword", form:"Recognized form", variant:"Spelling variant", prefix:"Starts with",
    suggestion:"Suggested spelling", filter:"Matches filters"};
  let offline, online, adapter = starter;
  let renderVersion = 0;
  let suggestionVersion = 0, suggestions = [], activeSuggestion = -1, suggestTimer;
  let goToContent = false, installController;
  let scholarly = preference("mode") === "scholarly";

  function preference(name, value) {
    try {
      if (value !== undefined) localStorage.setItem("open-dict:" + name, value);
      else return localStorage.getItem("open-dict:" + name);
    } catch (_) {}
    return null;
  }

  function element(tag, className, ...children) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    node.append(...children.filter(item => item !== undefined && item !== null));
    return node;
  }

  function button(label, action, className = "button") {
    const node = element("button", className, label);
    node.type = "button";
    node.addEventListener("click", action);
    return node;
  }

  function link(label, href, className) {
    const node = element("a", className, label);
    node.href = href;
    return node;
  }

  function external(label, href) {
    try {
      const url = new URL(href);
      if (url.protocol === "https:") return link(label, url);
    } catch (_) {}
    return element("span", "", label);
  }

  const hash = (word, sense) => "#" + new URLSearchParams(sense ? {word, sense} : {word});
  const wordLink = (word, sense) => link(word, hash(word, sense));
  const comparisonLink = (left, right) => "#" + new URLSearchParams({compare:left, with:right});
  const sourceName = id => (adapter.sourceInfo[id] || starter.sourceInfo[id])?.name || id;
  const posName = pos => positions[pos] || pos;
  const showStatus = message => { status.textContent = message; };

  async function copy(text, feedback) {
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(text);
      else {
        const field = element("textarea", "sr-only", text);
        const active = document.activeElement;
        document.body.append(field);
        field.select();
        const copied = document.execCommand("copy");
        field.remove();
        active?.focus();
        if (!copied) throw Error("Clipboard unavailable");
      }
      showStatus(feedback);
    } catch (_) {
      window.prompt("Copy this text", text);
    }
  }

  async function share(word) {
    const url = new URL(hash(word), location.href);
    url.search = "";
    if (navigator.share && /^https?:$/.test(url.protocol)) {
      try { await navigator.share({title:word + " · Open Dictionary", url:url.href}); return; }
      catch (error) { if (error.name === "AbortError") return; }
    }
    await copy(url.href, "Word link copied.");
  }

  function go(fragment) {
    closeSuggestions();
    goToContent = true;
    if (location.hash === fragment) render();
    else location.hash = fragment;
  }

  function closeSuggestions() {
    suggestionVersion++;
    clearTimeout(suggestTimer);
    suggestionList.hidden = true;
    suggestionList.replaceChildren();
    search.setAttribute("aria-expanded", "false");
    search.removeAttribute("aria-activedescendant");
    activeSuggestion = -1;
    suggestions = [];
  }

  function setSuggestion(index) {
    activeSuggestion = (index + suggestions.length) % suggestions.length;
    [...suggestionList.children].forEach((item, n) => item.setAttribute("aria-selected", String(n === activeSuggestion)));
    search.setAttribute("aria-activedescendant", "suggestion-" + activeSuggestion);
  }

  function chooseSuggestion(item) {
    search.value = item.word;
    go(hash(item.word));
  }

  function queueSuggestions() {
    closeSuggestions();
    const query = search.value.trim();
    if (!query) return;
    const version = suggestionVersion;
    suggestTimer = setTimeout(async () => {
      const matches = await queryAdapter("search", query, {limit:8, suggest:true}).catch(() => []);
      if (version !== suggestionVersion || !matches.length || document.activeElement !== search) return;
      suggestions = matches;
      suggestionList.replaceChildren(...matches.map((item, index) => {
        const option = element("li", "", element("strong", "", item.word), element("span", "meta", kinds[item.kind]));
        option.id = "suggestion-" + index;
        option.setAttribute("role", "option");
        option.setAttribute("aria-selected", "false");
        option.addEventListener("pointerdown", event => event.preventDefault());
        option.addEventListener("click", () => chooseSuggestion(item));
        return option;
      }));
      suggestionList.hidden = false;
      search.setAttribute("aria-expanded", "true");
      showStatus(matches.length + " suggestions available.");
    }, 100);
  }

  search.addEventListener("input", queueSuggestions);
  search.addEventListener("focus", queueSuggestions);
  search.addEventListener("blur", closeSuggestions);
  search.addEventListener("keydown", event => {
    if (event.key === "Escape") { closeSuggestions(); return; }
    if (!suggestions.length && event.key === "ArrowDown") { queueSuggestions(); return; }
    if (!suggestions.length) return;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setSuggestion(activeSuggestion < 0 ? (event.key === "ArrowDown" ? 0 : suggestions.length - 1)
        : activeSuggestion + (event.key === "ArrowDown" ? 1 : -1));
    } else if (event.key === "Enter" && activeSuggestion >= 0) {
      event.preventDefault();
      chooseSuggestion(suggestions[activeSuggestion]);
    }
  });

  function openFilters(open) {
    filterFields.hidden = filterFields.disabled = !open;
    filterToggle.setAttribute("aria-expanded", String(open));
  }

  filterToggle.addEventListener("click", () => openFilters(filterFields.hidden));
  form.addEventListener("submit", event => {
    event.preventDefault();
    const value = search.value.trim();
    const filters = Object.fromEntries([...new FormData(form)].filter(([, value]) => value.trim()));
    if (Object.keys(filters).length) go("#" + new URLSearchParams({q:value, ...filters}));
    else if (value) go(hash(value));
    else search.focus();
  });

  document.addEventListener("keydown", event => {
    if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey ||
        event.target.closest("input, textarea, select, [contenteditable]")) return;
    event.preventDefault();
    search.focus();
    search.select();
  });

  document.addEventListener("click", event => {
    const target = event.target.closest('a[href^="#"]');
    if (!target || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0 ||
        target.getAttribute("href") === "#content") return;
    event.preventDefault();
    go(target.getAttribute("href"));
  });

  const theme = document.querySelector("#theme");
  function setTheme(value) {
    if (!["light", "dark"].includes(value)) value = "system";
    document.documentElement.dataset.theme = value;
    theme.textContent = "Theme: " + value;
    return value;
  }
  let themeValue = setTheme(preference("theme"));
  theme.addEventListener("click", () => {
    themeValue = setTheme(({system:"light", light:"dark", dark:"system"})[themeValue]);
    preference("theme", themeValue);
  });

  async function queryAdapter(method, ...args) {
    let value;
    try {
      value = await adapter[method](...args);
    } catch (error) {
      if (adapter !== online) throw error;
      adapter = offline || starter;
      value = await adapter[method](...args);
    }
    return method === "lookup" && value ? dictionary.presentationOrder(value) : value;
  }

  function modeButton() {
    const control = button("Scholarly mode", () => {
      scholarly = !scholarly;
      preference("mode", scholarly ? "scholarly" : "simple");
      render().then(() => content.querySelector("[data-mode]")?.focus({preventScroll:true}));
    });
    control.dataset.mode = "";
    control.setAttribute("aria-pressed", String(scholarly));
    return control;
  }

  function renderRelations(relations, expanded) {
    const box = element("div");
    for (const [type, terms] of Object.entries(relations || {})) {
      if (!Array.isArray(terms) || !terms.length || (!expanded &&
          !["synonyms","antonyms","antonym","form_of","alt_of"].includes(type))) continue;
      const group = element("p", "related", element("strong", "", type.replaceAll("_", " ") + " "), " ");
      const visible = terms.slice(0, expanded ? 60 : 5);
      visible.forEach((term, index) => {
        if (index) group.append(" · ");
        group.append(wordLink(term.word, term.sense));
        if (expanded && term.qualifier) group.append(" (" + term.qualifier + ")");
      });
      if (visible.length < terms.length) group.append(" · " + (terms.length - visible.length) + " more in source");
      box.append(group);
    }
    return box;
  }

  function labels(items) {
    return element("div", "label-list", ...[...new Set(items)].map(item => element("span", "label", item)));
  }

  function detail(title, ...body) {
    return element("details", "", element("summary", "", title), ...body);
  }

  function renderSense(sense, group, selected) {
    const item = element("li", sense.id === selected ? "selected" : "");
    item.id = "sense-" + sense.id;
    item.tabIndex = -1;
    const tags = [...(sense.labels || []), ...(scholarly ? sense.domains || [] : [])];
    if (tags.length) item.append(labels(scholarly ? tags : tags.slice(0, 7)));
    if (scholarly && !sense.parent && sense.glossPath?.length) {
      item.append(element("p", "meta", sense.glossPath.join(" › ")));
    }
    item.append(element("p", "definition", sense.definition));
    for (const example of (sense.examples || []).slice(0, scholarly ? undefined : 2)) {
      item.append(element("blockquote", "example", example.text, example.ref ? element("cite", "", example.ref) : null));
    }
    item.append(renderRelations(sense.relations, scholarly));
    item.append(element("div", "sense-actions",
      button("Copy definition", () => copy(sense.definition, "Definition copied."), "text-button"),
      link("Sense link", hash(group.word, sense.id))));
    if (scholarly) {
      const ids = [...(sense.sourceIds || []), sense.synset, sense.ili].filter(Boolean);
      item.append(detail("Sense provenance",
        element("p", "meta", sourceName(group.source) + " · " + group.version + " · Source-imported"),
        ids.length ? element("p", "code", ids.join(" · ")) : null,
        element("p", "code", "Open Dictionary ID " + sense.id)));
    }
    return item;
  }

  function senseTree(group, selected) {
    const list = element("ol", "sense-list");
    const nodes = new Map();
    for (const sense of group.senses) {
      const item = renderSense(sense, group, selected);
      nodes.set(sense.id, item);
      const parent = nodes.get(sense.parent);
      if (parent && parent !== item) {
        let children = parent.querySelector(":scope > ol");
        if (!children) { children = element("ol"); parent.append(children); }
        children.append(item);
      } else list.append(item);
    }
    return list;
  }

  function lexeme(group, selected, level, word) {
    const title = (group.word === word ? "" : group.word + " · ") + posName(group.pos) + (group.origin ? " · origin " + group.origin : "");
    const card = element("article", "lexeme", element(level, "", title));
    card.id = "lexeme-" + group.id;
    card.tabIndex = -1;
    if (group.historical) card.append(element("p", "meta", "Historical dictionary · 1913"));
    if (scholarly && group.sourceHeader) card.append(detail("Source headword line", element("p", "", group.sourceHeader)));
    const sounds = (group.pronunciations || []).filter(sound => sound.ipa);
    const unique = [...new Set(sounds.map(sound => sound.ipa))];
    if (unique.length) card.append(element("p", "ipa", unique.slice(0, scholarly ? 8 : 3).join("  ·  ")));
    if (scholarly && (group.pronunciations || []).length) {
      const rows = group.pronunciations.map(sound => {
        const audio = sound.audioFile
          ? external("Commons recording and license", "https://commons.wikimedia.org/wiki/File:" + encodeURIComponent(sound.audioFile))
          : null;
        return element("li", "", [sound.ipa, ...(sound.labels || []), sound.note].filter(Boolean).join(" · "), audio ? " " : null, audio);
      });
      card.append(detail("Pronunciations and variants", element("ul", "pronunciations", ...rows)));
    }
    card.append(senseTree(group, selected));
    if (group.etymology) card.append(detail("Etymology", element("p", "", group.etymology)));
    if (group.forms?.length) {
      card.append(detail("Forms and spellings", element("div", "inline", ...group.forms.slice(0, 100).map(form => {
        const node = wordLink(form.word);
        if (form.labels.length) node.title = form.labels.join(", ");
        return node;
      }))));
    }
    if (scholarly) {
      card.append(renderRelations(group.relations, true));
      if (group.evidence?.text) {
        const evidence = element("pre", "source-evidence code", group.evidence.text);
        evidence.tabIndex = 0;
        card.append(detail(group.evidence.label || "Source evidence", evidence));
      }
    }
    card.append(element("p", "meta", external(sourceName(group.source), group.sourceUrl),
      scholarly ? " · " + group.version : null));
    return card;
  }

  function recordGroups(record, selected, level = "h2") {
    const sections = [];
    const ids = [...new Set(record.groups.map(group => group.source))];
    for (const id of ids) {
      const groups = record.groups.filter(group => group.source === id);
      const visible = scholarly || sections.length === 0 || groups.some(group => group.senses.some(sense => sense.id === selected));
      if (!visible) continue;
      sections.push(element("section", "source-section", element(level, "source-label", sourceName(id)),
        ...groups.map(group => lexeme(group, selected, level === "h2" ? "h3" : "h4", record.word))));
    }
    return sections;
  }

  function home() {
    const pool = ["serendipity","ephemeral","palimpsest","mellifluous","petrichor","zephyr","equinox","nocturnal"];
    const day = Math.floor(Date.now() / 86400000);
    const featured = window.OPEN_DICT_STARTER.entries.find(record => record.key === pool[day % pool.length]);
    const entry = featured.groups.find(group => group.pos === "noun" || group.pos === "adj") || featured.groups[0];
    const ipa = entry.pronunciations?.find(sound => sound.ipa)?.ipa;
    const daily = element("section", "daily", element("h2", "", "Word of the day"),
      element("h3", "", wordLink(featured.word)), element("p", "ipa", posName(entry.pos), ipa ? " · " + ipa : ""),
      element("p", "definition", entry.senses[0].definition),
      link("Read the entry →", hash(featured.word), "daily-link"),
      element("p", "meta", sourceName(entry.source)));
    const explore = element("section", "explore", element("h2", "", "Compare words"),
      element("p", "meta", "Read source definitions and usage side by side."));
    for (const [left, right] of [["affect","effect"],["infer","imply"],["continual","continuous"],["historic","historical"]]) {
      const pair = link(left + " / " + right, comparisonLink(left, right));
      const arrow = element("span", "", "↗");
      arrow.setAttribute("aria-hidden", "true");
      pair.append(arrow);
      explore.append(pair);
    }
    return element("div", "home-grid", daily, explore);
  }

  function heading(title, description) {
    return element("div", "view", element("h1", "section-title", title), description ? element("p", "meta", description) : null);
  }

  function resultList(results) {
    return element("ul", "result-list", ...results.map(item => element("li", "",
      link(element("span", "", element("strong", "", item.word), element("span", "meta", " · " + kinds[item.kind])),
        hash(item.word)))));
  }

  function pronunciationRecording(record) {
    if (!Object.hasOwn(window.OPEN_DICT_AUDIO, record.key)) return null;
    const clip = window.OPEN_DICT_AUDIO[record.key];
    const audio = element("audio");
    audio.controls = true;
    audio.preload = "none";
    audio.src = clip.file;
    audio.setAttribute("aria-label", "US pronunciation of " + record.word);
    return element("div", "audio-player", audio,
      element("p", "meta", "US pronunciation · ", external("Dvortygirl", clip.source), " · ",
        external("CC BY-SA 3.0", "https://creativecommons.org/licenses/by-sa/3.0/"), " · MP3 conversion"));
  }

  function entryPage(record, selected, related) {
    const groups = record.groups.filter(group => scholarly || group.source === record.groups[0].source ||
      group.senses.some(sense => sense.id === selected));
    const sidebar = element("aside", "", element("h2", "", "On this page"), element("ul", "",
      ...groups.map(group => element("li", "", button((group.word === record.word ? "" : group.word + " · ") + posName(group.pos) +
        (group.origin ? " · origin " + group.origin : "") + (scholarly ? " · " + sourceName(group.source) : ""), () => {
        const target = document.getElementById("lexeme-" + group.id);
        target?.focus();
        target?.scrollIntoView({block:"start"});
      }, "text-button")))));
    if (related.length) sidebar.append(element("hr"), element("h2", "", "Forms and variants"),
      element("ul", "", ...related.map(item => element("li", "", wordLink(item.word), " ", element("span", "meta", kinds[item.kind])))));
    return element("div", "",
      element("div", "entry-heading", element("h1", "word-title", record.word), element("p", "meta", adapter.name),
        element("div", "inline", modeButton(), button("Copy word", () => copy(record.word, "Word copied.")),
          button("Share", () => share(record.word)), link("Compare", "#" + new URLSearchParams({compare:record.word}), "button")),
        pronunciationRecording(record)),
      element("div", "entry-layout", element("div", "", ...recordGroups(record, selected)), sidebar));
  }

  async function compare(left, right) {
    const page = heading("Compare words", "Read each source’s entries side by side.");
    const compareForm = element("form", "compare-form");
    const fields = ["First word","Second word"].map((label, index) => {
      const field = element("input");
      field.required = true;
      field.maxLength = 200;
      field.value = index ? right : left;
      compareForm.append(element("label", "", label, field));
      return field;
    });
    const submit = element("button", "button primary", "Compare");
    compareForm.append(submit);
    compareForm.addEventListener("submit", event => {
      event.preventDefault();
      if (fields.every(field => field.value.trim())) go(comparisonLink(...fields.map(field => field.value.trim())));
    });
    page.append(compareForm);
    if (!left || !right) return page;
    const records = await Promise.all([left, right].map(word => queryAdapter("lookup", word, {scholarly})));
    page.append(modeButton(), element("div", "compare-grid", ...records.map((record, index) => {
      const term = record?.word || [left, right][index];
      return element("section", "", element("h2", "section-title", record ? wordLink(term) : term),
        ...(record ? recordGroups(record, null, "h3") : [element("p", "meta", "This word is unavailable in " + adapter.name + ".")]));
    })));
    return page;
  }

  function sourcePage() {
    const page = heading("Sources and methods",
      "Definitions are shown under the source that supplied them. Each source keeps its own senses and usage labels.");
    for (const source of Object.values(adapter.sourceInfo)) {
      page.append(element("section", "panel", element("h2", "", external(source.name, source.url)),
        element("p", "meta", source.version + " · " + source.license),
        element("p", "", source.attribution),
        element("div", "inline", external("License", source.licenseUrl), external("Source terms", source.terms),
          source.extractor ? external("Extract provider", source.extractor) : null),
        ...(source.noticeText || []).map((notice, index) => detail(index ? "Princeton WordNet notice" : "License notice",
          element("p", "code", notice)))));
    }
    const updater = element("div", "acs-update");
    updater.dataset.acsUpdate = "";
    const check = element("button", "", "Check for updates");
    check.type = "button";
    check.dataset.acsUpdateButton = "";
    const updateStatus = element("p");
    updateStatus.dataset.acsUpdateStatus = "";
    updateStatus.setAttribute("role", "status");
    updater.append(check, updateStatus);
    page.append(detail("About Open Dictionary", element("p", "", "Open Dictionary is part of the ",
      link("ACS Web Apps project", "../../"), "."), updater));
    return page;
  }

  function offlinePage() {
    const page = heading("Offline dictionary", "The starter collection works offline after the app finishes caching.");
    let previous;
    try { previous = JSON.parse(preference("pack-installation")); } catch (_) {}
    let description = "No extra pack installed.";
    if (offline) description = "Installed: " + offline.edition + " · " + offline.release;
    else if (previous && typeof previous.edition === "string" && Number.isFinite(previous.installedAt)) {
      description = "Previously installed " + previous.edition + ". Check for data packs to download it again.";
    }
    const state = element("p", "meta", description);
    const list = element("div", "pack-list");
    const message = element("p", "status");
    message.setAttribute("role", "status");
    const progress = element("progress");
    progress.hidden = true;
    progress.setAttribute("aria-label", "Dictionary pack installation");
    const cancel = button("Cancel download", () => installController?.abort());
    cancel.hidden = true;
    const check = button("Check for data packs", load);
    page.append(state, check, list, progress, cancel, message,
      detail("Install the app", element("p", "", "In Safari on iPhone or iPad, open Share and choose Add to Home Screen. In supported desktop or Android browsers, use Install in the browser menu."),
        element("p", "", "Browser storage can be cleared by the device. Open this page to download a pack again.")));
    if (installController) message.textContent = "A pack download is already running in this tab.";

    async function load() {
      check.disabled = true;
      list.replaceChildren();
      message.textContent = "Checking available packs…";
      try {
        const manifest = await dictionary.manifest();
        if (!Object.keys(manifest.editions).length) {
          message.textContent = "No packs are published at this address.";
          return;
        }
        for (const [edition, info] of Object.entries(manifest.editions)) {
          const installed = offline?.release === manifest.release && offline?.edition === edition;
          const size = new Intl.NumberFormat(undefined, {maximumFractionDigits:1}).format(info.bytes / 1048576);
          const download = button(installed ? "Installed" : "Download", () => install(manifest, edition));
          download.disabled = installed;
          list.append(element("section", "panel", element("h3", "", edition),
            element("p", "meta", info.headwords.toLocaleString() + " headwords · " +
              (info.bytes < 1024 * 1024 ? Math.ceil(info.bytes / 1024) + " KiB" : size + " MiB") + " download"),
            download));
        }
        message.textContent = "Release " + manifest.release;
      } catch (error) {
        message.textContent = error.message === "Unavailable" || navigator.onLine === false
          ? "No packs are reachable here. You can still use the starter collection." : error.message;
      } finally {
        check.disabled = false;
      }
    }

    async function install(manifest, edition) {
      if (installController) return;
      installController = new AbortController();
      const downloads = [...list.querySelectorAll("button")];
      downloads.forEach(control => { control.disabled = true; });
      progress.hidden = cancel.hidden = false;
      progress.value = 0;
      progress.max = manifest.editions[edition].headwords;
      message.textContent = "Checking and installing the download…";
      try {
        await dictionary.installPack(manifest, edition, (count, max) => {
          progress.value = count;
          message.textContent = "Installed " + count.toLocaleString() + " of " + max.toLocaleString() + " headwords.";
        }, installController.signal);
        offline = await dictionary.offlineAdapter();
        if (offline) preference("pack-installation", JSON.stringify({
          edition:offline.edition, release:offline.release, installedAt:Date.now()
        }));
        adapter = online || offline || starter;
        showStatus(edition + " is ready for offline use.");
        if (location.hash === "#offline") {
          installController = null;
          render();
          return;
        }
      } catch (error) {
        message.textContent = installController.signal.aborted ? "Download cancelled. Your existing data are ready to use."
          : "The pack could not be installed. " + error.message;
        downloads.forEach(control => { control.disabled = control.textContent === "Installed"; });
      } finally {
        installController = null;
        progress.hidden = cancel.hidden = true;
      }
    }
    return page;
  }

  async function render() {
    const version = ++renderVersion;
    const fragment = location.hash.slice(1);
    if (fragment === "content") return;
    const params = new URLSearchParams(fragment.includes("=") ? fragment : "");
    const initialWord = !fragment ? new URLSearchParams(location.search).get("word") : null;
    const word = (params.get("word") || initialWord || "").slice(0, 200);
    const query = (params.get("q") || "").slice(0, 200);
    const advanced = params.has("q");
    const pageName = params.has("compare") || fragment === "compare" ? "compare"
      : ["sources","offline"].includes(fragment) ? fragment : "home";
    const isHome = pageName === "home" && !word && !advanced;
    document.body.classList.toggle("inner", !isHome);
    document.querySelector("#hero").hidden = !isHome;
    document.querySelectorAll("[data-nav]").forEach(anchor => {
      if (anchor.dataset.nav === pageName) anchor.setAttribute("aria-current", "page");
      else anchor.removeAttribute("aria-current");
    });
    document.title = word ? word + " · Open Dictionary" : "Open Dictionary";
    const currentFilters = {};
    Array.from(filterFields.elements).filter(control => control.name).forEach(control => {
      control.value = advanced ? (params.get(control.name) || "").slice(0, 80) : "";
      if (control.value) currentFilters[control.name] = control.value;
    });
    if (advanced) openFilters(true);
    if (document.activeElement !== search) search.value = word || query;
    let page;
    const selected = params.get("sense");
    try {
      if (pageName === "sources") page = sourcePage();
      else if (pageName === "offline") page = offlinePage();
      else if (pageName === "compare") page = await compare((params.get("compare") || "").slice(0, 200), (params.get("with") || "").slice(0, 200));
      else if (advanced) {
        const results = await queryAdapter("search", query, {filters:currentFilters});
        const empty = adapter.boundedFilters ? "No matches in this browser search window. Add a beginning to narrow the search."
          : "No entries match these filters.";
        page = heading("Search results", results.length ? adapter.name : empty);
        page.append(resultList(results));
      } else if (word) {
        const record = await queryAdapter("lookup", word, {scholarly});
        const results = await queryAdapter("search", word, {limit:18, suggest:Boolean(record)});
        if (record) page = entryPage(record, selected, results.filter(item => ["form","variant"].includes(item.kind)));
        else {
          page = heading("No exact entry for “" + word + "”", results.length
            ? "Browse recognized forms and suggested spellings." : "This word is unavailable in " + adapter.name + ".");
          page.append(resultList(results));
        }
      } else page = home();
    } catch (_) {
      page = heading("Dictionary unavailable", "Reload the app and try your search again.");
    }
    if (version !== renderVersion) return;
    content.replaceChildren(page);
    const target = selected && document.getElementById("sense-" + selected);
    if (target) {
      target.focus({preventScroll:true});
      target.scrollIntoView({block:"start"});
    } else if (goToContent) content.focus({preventScroll:true});
    goToContent = false;
  }

  window.addEventListener("hashchange", () => { closeSuggestions(); render(); });
  const sourceFilter = document.querySelector("#source-filter");
  function updateSourceOptions() {
    sourceFilter.replaceChildren(new Option("Any", ""),
      ...Object.entries(adapter.sourceInfo).map(([id, info]) => new Option(info.name, id)));
  }

  updateSourceOptions();
  render();
  if (/^https?:$/.test(location.protocol)) {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("sw.js", {scope:"./", updateViaCache:"none"}).catch(() => {});
    }
    Promise.all([
      dictionary.offlineAdapter().catch(() => null),
      navigator.onLine ? dictionary.apiAdapter("api/v1/").catch(() => null) : null
    ]).then(([pack, api]) => {
      offline = pack;
      online = api;
      adapter = online || offline || starter;
      updateSourceOptions();
      if (adapter !== starter) render();
    });
  }
})();
