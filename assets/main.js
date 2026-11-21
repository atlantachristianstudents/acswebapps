/*
 * ACS Web Apps — home page behaviour: theme, layout, filters, search, app cards, favorites.
 * The app registry itself lives in apps.js (window.APPS).
 */
(function () {
  "use strict";

  const apps = window.APPS || [];
  const root = document.documentElement;
  const grid = document.getElementById("grid");
  const tagsEl = document.getElementById("tags");
  const search = document.getElementById("search");
  const empty = document.getElementById("empty");
  const themeToggle = document.getElementById("theme-toggle");
  const installedDirectory = navigator.standalone === true ||
    window.matchMedia("(display-mode: standalone), (display-mode: minimal-ui)").matches;
  const appsPath = new URL("apps/", location.href).pathname;
  const launchKey = "acswebapps-directory-launch";
  let activeTags = [];

  /* ---------- footer year ---------- */
  const year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();

  /* ---------- theme ---------- */
  const themeDialog = document.getElementById("theme-dialog");
  const themePresets = document.getElementById("theme-presets");
  const themeNameEl = document.getElementById("theme-name");
  const saveThemeBtn = document.getElementById("save-theme");
  const THEME_NAMES = window.acswebappsTheme ? window.acswebappsTheme.names :
    ["dawn", "paper", "sage", "ocean", "rose", "dusk", "midnight", "custom"];
  const CUSTOM_DEFAULTS = window.acswebappsTheme ? window.acswebappsTheme.defaults :
    { bg:"#f4efe5", text:"#24302b", muted:"#596459", surface:"#fffdf8", panel:"#f9f6ee",
      border:"#c9c8bc", accent:"#44584b", "on-accent":"#ffffff", selected:"#e8eee4",
      focus:"#74876a", font:"serif" };

  // Draft state while the picker dialog is open.
  let draftName = window.acswebappsTheme ? window.acswebappsTheme.get() : "dawn";
  let draftCustom = window.acswebappsTheme ? Object.assign({}, CUSTOM_DEFAULTS, window.acswebappsTheme.getCustom() || {}) : Object.assign({}, CUSTOM_DEFAULTS);

  function currentTheme() {
    if (window.acswebappsTheme) return window.acswebappsTheme.get();
    return root.getAttribute("data-theme") || "dawn";
  }

  function applyTheme(theme, persist, custom) {
    if (window.acswebappsTheme) {
      if (window.acswebappsTheme.preview) {
        window.acswebappsTheme.preview(theme, theme === "custom" ? (custom || null) : null);
      } else {
        window.acswebappsTheme.apply(theme);
      }
    } else {
      root.setAttribute("data-theme", theme);
    }
    if (themeNameEl) themeNameEl.textContent = theme.charAt(0).toUpperCase() + theme.slice(1);
    if (persist) {
      if (window.acswebappsTheme) {
        window.acswebappsTheme.set(theme);
        if (theme === "custom") window.acswebappsTheme.setCustom(draftCustom);
      }
    }
  }

  // The shared cookie script already applied the saved theme before first paint.
  // Nothing to do at boot — the page is already themed.

  const customControls = document.getElementById("custom-theme-controls");

  function previewTheme(name) {
    draftName = name;
    applyTheme(name, false, draftCustom);
    if (customControls) customControls.hidden = name !== "custom";
    document.querySelectorAll("#theme-presets [data-theme-choice]").forEach((btn) => {
      btn.setAttribute("aria-pressed", String(btn.dataset.themeChoice === name));
    });
  }

  function openThemeDialog() {
    // Start the draft from the currently saved values.
    draftName = currentTheme();
    if (draftName === "custom") {
      draftCustom = Object.assign({}, CUSTOM_DEFAULTS, window.acswebappsTheme ? window.acswebappsTheme.getCustom() : {});
    } else {
      draftCustom = Object.assign({}, CUSTOM_DEFAULTS);
    }
    // If the user has never customized, seed the custom colors from the current preset.
    if (draftName !== "custom" && !(window.acswebappsTheme && window.acswebappsTheme.getCustom())) {
      const cs = getComputedStyle(root);
      ["bg","text","muted","surface","panel","border","accent","on-accent","selected","focus"].forEach((k) => {
        const v = cs.getPropertyValue("--" + k).trim();
        if (/^#[0-9a-f]{6}$/i.test(v)) draftCustom[k] = v;
      });
    }
    document.querySelectorAll("[data-theme-color]").forEach((input) => {
      input.value = draftCustom[input.dataset.themeColor] || CUSTOM_DEFAULTS[input.dataset.themeColor];
    });
    const fontSel = document.getElementById("custom-theme-font");
    if (fontSel) fontSel.value = draftCustom.font || "serif";
    previewTheme(draftName);
    themeDialog.showModal();
  }

  function cancelTheme() {
    // Revert to the last saved theme + custom values.
    const saved = window.acswebappsTheme ? window.acswebappsTheme.get() : "dawn";
    draftCustom = Object.assign({}, CUSTOM_DEFAULTS,
      window.acswebappsTheme ? window.acswebappsTheme.getCustom() || {} : {});
    applyTheme(saved, false, draftCustom);
  }

  if (themeToggle) {
    themeToggle.addEventListener("click", () => {
      if (!themeDialog) return;
      openThemeDialog();
    });
  }

  if (themePresets) {
    themePresets.addEventListener("click", (event) => {
      const btn = event.target.closest("[data-theme-choice]");
      if (!btn) return;
      const choice = btn.dataset.themeChoice;
      // When switching to custom for the first time, seed from the live colors.
      if (choice === "custom" && !(window.acswebappsTheme && window.acswebappsTheme.getCustom())) {
        const cs = getComputedStyle(root);
        ["bg","text","muted","surface","panel","border","accent","on-accent","selected","focus"].forEach((k) => {
          const v = cs.getPropertyValue("--" + k).trim();
          if (/^#[0-9a-f]{6}$/i.test(v)) draftCustom[k] = v;
        });
      }
      document.querySelectorAll("[data-theme-color]").forEach((input) => {
        input.value = draftCustom[input.dataset.themeColor] || CUSTOM_DEFAULTS[input.dataset.themeColor];
      });
      const fontSel = document.getElementById("custom-theme-font");
      if (fontSel) fontSel.value = draftCustom.font || "serif";
      previewTheme(choice);
    });
  }

  // Live-update the custom draft as the user picks colors / font.
  document.querySelectorAll("[data-theme-color]").forEach((input) => {
    input.addEventListener("input", () => {
      draftCustom[input.dataset.themeColor] = input.value;
      previewTheme("custom");
    });
  });
  const fontSel = document.getElementById("custom-theme-font");
  if (fontSel) {
    fontSel.addEventListener("change", () => {
      draftCustom.font = fontSel.value;
      previewTheme("custom");
    });
  }

  // "Surprise me": generate a random, accessible custom palette.
  function hslToHex(hue, saturation, lightness) {
    const s = saturation / 100, l = lightness / 100, a = s * Math.min(l, 1 - l);
    const channel = (n) => {
      const k = (n + hue / 30) % 12;
      return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))))
        .toString(16).padStart(2, "0");
    };
    return "#" + channel(0) + channel(8) + channel(4);
  }
  function hexLuminance(hex) {
    const rgb = [1, 3, 5].map((o) => {
      const v = parseInt(hex.slice(o, o + 2), 16) / 255;
      return v <= .04045 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4);
    });
    return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722;
  }
  function contrast(a, b) {
    const la = hexLuminance(a), lb = hexLuminance(b);
    return (Math.max(la, lb) + .05) / (Math.min(la, lb) + .05);
  }
  const surpriseBtn = document.getElementById("surprise-theme");
  if (surpriseBtn) {
    surpriseBtn.addEventListener("click", () => {
      const between = (min, max) => min + Math.random() * (max - min);
      const hue = between(0, 360), accentHue = (hue + between(35, 325)) % 360;
      const dark = Math.random() < .5, saturation = between(10, 45);
      const color = (light, darkLight, sat = saturation, h = hue) =>
        hslToHex(h, sat, dark ? darkLight : light);
      const palette = {
        bg: color(between(90, 97), between(6, 14)),
        surface: color(between(96, 99), between(14, 20)),
        panel: color(between(92, 96), between(10, 16)),
        selected: color(between(81, 88), between(21, 28)),
        border: color(between(53, 64), between(40, 50)),
        text: color(between(5, 13), between(93, 99), between(5, 35)),
        muted: color(between(23, 31), between(73, 85), between(5, 25)),
        accent: color(between(23, 35), between(72, 85), between(40, 80), accentHue),
        focus: color(between(26, 38), between(70, 83), between(40, 80), accentHue),
        font: Object.keys(window.acswebappsTheme.fonts)[Math.floor(Math.random() * 4)]
      };
      const backgrounds = ["bg", "surface", "panel", "selected"].map((k) => palette[k]);
      ["text", "muted", "accent", "focus"].forEach((k) => {
        if (backgrounds.some((bg) => contrast(palette[k], bg) < 4.5)) palette[k] = dark ? "#ffffff" : "#000000";
      });
      palette["on-accent"] = contrast(palette.accent, "#ffffff") >= contrast(palette.accent, "#000000") ? "#ffffff" : "#000000";
      draftCustom = Object.assign({}, palette);
      document.querySelectorAll("[data-theme-color]").forEach((input) => {
        input.value = draftCustom[input.dataset.themeColor] || CUSTOM_DEFAULTS[input.dataset.themeColor];
      });
      if (fontSel) fontSel.value = draftCustom.font;
      previewTheme("custom");
    });
  }

  const cancelBtn = document.getElementById("cancel-theme");
  if (cancelBtn) {
    cancelBtn.addEventListener("click", () => {
      themeDialog && themeDialog.close();
      cancelTheme();
    });
  }

  if (saveThemeBtn) {
    saveThemeBtn.addEventListener("click", () => {
      console.log("[home-theme] save clicked, draftName=" + draftName);
      if (draftName === "custom") window.acswebappsTheme && window.acswebappsTheme.setCustom(draftCustom);
      applyTheme(draftName, true, draftCustom);
      themeDialog.close();
    });
  }

  if (themeDialog) {
    themeDialog.addEventListener("cancel", () => cancelTheme());
    themeDialog.addEventListener("keydown", (event) => {
      if (event.key === "Escape") themeDialog.close();
    });
  }

  /* ---------- directory updates ---------- */
  const pageVersion = document.currentScript.dataset.version;
  const helpDialog = document.getElementById("help-dialog");
  const updateButton = document.getElementById("check-for-updates");
  const updateStatus = document.getElementById("update-status");
  document.getElementById("help-toggle")?.addEventListener("click", () => helpDialog.showModal());
  updateButton?.addEventListener("click", checkForUpdates);

  function withTimeout(task, milliseconds, message) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(message)), milliseconds);
      task.then(resolve, reject).finally(() => clearTimeout(timer));
    });
  }

  function waitForActivation(worker) {
    return new Promise((resolve, reject) => {
      const finish = (error) => {
        clearTimeout(timer);
        worker.removeEventListener("statechange", inspect);
        if (error) reject(error);
        else resolve();
      };
      const inspect = () => {
        if (worker.state === "activated") finish();
        if (worker.state === "redundant") finish(new Error("The update could not install. Please try again."));
      };
      const timer = setTimeout(() => finish(new Error("The update took too long to install. Please try again.")), 30000);
      worker.addEventListener("statechange", inspect);
      inspect();
    });
  }

  async function readWorkerVersion(worker) {
    const channel = new MessageChannel();
    try {
      const reply = new Promise((resolve) => {
        channel.port1.onmessage = (event) => resolve(event.data?.version);
      });
      worker.postMessage({ type: "ACS_GET_VERSION" }, [channel.port2]);
      return await withTimeout(reply, 5000, "Could not verify the installed version. Please try again.");
    } finally {
      channel.port1.close();
    }
  }

  async function checkForUpdates() {
    if (updateButton.disabled) return;
    if (!("serviceWorker" in navigator) || !/^https?:$/.test(location.protocol)) {
      updateStatus.textContent = "Open ACS Web Apps on its website or as an installed app to check for updates.";
      return;
    }
    if (!navigator.onLine) {
      updateStatus.textContent = "You’re offline. Connect to the internet and try again.";
      return;
    }

    updateButton.disabled = true;
    updateStatus.textContent = "Checking for updates…";
    try {
      const timeoutMessage = "The update check timed out. Please try again.";
      const registration = await withTimeout(
        navigator.serviceWorker.register("sw.js", { updateViaCache: "none" }), 20000, timeoutMessage
      );
      await withTimeout(registration.update(), 20000, timeoutMessage);
      const candidate = registration.installing || registration.waiting;
      if (candidate) {
        updateStatus.textContent = "Installing update…";
        await waitForActivation(candidate);
      }
      const worker = registration.active;
      if (!worker) throw new Error("No installed version found. Reload and try again.");
      const version = await readWorkerVersion(worker);
      if (!/^acswebapps-home-v\d+$/.test(version)) throw new Error("Could not verify the installed version. Please try again.");
      if (version !== pageVersion) {
        updateStatus.textContent = "Update ready. Restarting…";
        location.reload();
      } else {
        updateStatus.textContent = "ACS Web Apps is up to date.";
      }
    } catch (error) {
      updateStatus.textContent = error.name === "Error" ? error.message :
        "Could not check for updates. Check your connection and try again.";
    } finally {
      updateButton.disabled = false;
    }
  }

  /* ---------- keyboard shortcuts ---------- */
  document.addEventListener("keydown", (event) => {
    if (
      updateButton && event.metaKey && !event.ctrlKey && !event.altKey && !event.shiftKey &&
      event.key.toLowerCase() === "u"
    ) {
      event.preventDefault();
      if (!event.repeat) {
        if (!helpDialog.open) helpDialog.showModal();
        checkForUpdates();
      }
      return;
    }

    if (
      (event.key === "/" || event.key === "?") &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.altKey &&
      document.activeElement !== search &&
      !document.activeElement?.closest("dialog") &&
      !["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName)
    ) {
      event.preventDefault();
      search?.focus();
    }

    if (event.key === "Escape" && document.activeElement === search) {
      search.value = "";
      search.dispatchEvent(new Event("input", { bubbles: true }));
      search.blur();
    }
  });

  /* ---------- tags ---------- */
  const allTags = ["All"];
  apps.forEach((app) => {
    (app.tags || []).forEach((tag) => {
      if (allTags.indexOf(tag) === -1) allTags.push(tag);
    });
  });
  allTags.push("Hide Beta");

  function renderTags() {
    tagsEl.innerHTML = "";
    allTags.forEach((tag) => {
      const on = tag === "All" ? activeTags.length === 0 : activeTags.includes(tag);
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "chip" + (tag === "Hide Beta" ? " modifier" : "") + (on ? " active" : "");
      chip.textContent = tag;
      chip.setAttribute("aria-pressed", on ? "true" : "false");
      chip.addEventListener("click", () => {
        if (tag === "All") {
          activeTags = [];
        } else {
          const i = activeTags.indexOf(tag);
          if (i === -1) {
            activeTags.push(tag);
          } else {
            activeTags.splice(i, 1);
          }
        }
        renderTags();
        renderApps();
      });
      tagsEl.appendChild(chip);
    });
  }

  /* ---------- directory layout ---------- */
  const compactToggle = document.getElementById("compact-view");
  const layoutKey = "acswebapps-layout";

  if (compactToggle) {
    let compact = false;
    try { compact = localStorage.getItem(layoutKey) === "compact"; } catch (e) {}

    function applyLayout() {
      grid.classList.toggle("compact", compact);
      compactToggle.setAttribute("aria-pressed", String(compact));
    }

    applyLayout();
    compactToggle.hidden = false;
    compactToggle.addEventListener("click", () => {
      compact = !compact;
      applyLayout();
      try { localStorage.setItem(layoutKey, compact ? "compact" : "cards"); } catch (e) {}
    });
  }

  /* ---------- cards ---------- */
  const STATUS_LABEL = { live: "Live", beta: "Beta", soon: "Coming soon" };
  const STATUS_ORDER = { live: 0, beta: 1, soon: 2 };
  const appsById = new Map(apps.map((app) => [app.id, app]));
  const groupedApps = new Map();
  const groupParents = new Map();
  apps.forEach((app) => {
    const parent = appsById.get(app.groupWith);
    if (!parent || parent === app || parent.groupWith || parent.status === "soon" || app.status === "soon") return;
    if (!groupedApps.has(parent.id)) groupedApps.set(parent.id, []);
    groupedApps.get(parent.id).push(app);
    groupParents.set(app.id, parent.id);
  });
  const pinnedKey = "acswebapps-pinned-apps";
  const pinnedApps = new Set();
  try {
    const saved = JSON.parse(localStorage.getItem(pinnedKey));
    if (Array.isArray(saved)) {
      saved.forEach((id) => {
        if (typeof id === "string") pinnedApps.add(groupParents.get(id) || id);
      });
    }
  } catch (e) {}

  const sortedApps = apps.filter((app) => !groupParents.has(app.id)).sort((a, b) =>
    ((STATUS_ORDER[a.status || "live"] ?? 3) - (STATUS_ORDER[b.status || "live"] ?? 3)) ||
    (a.name || "").localeCompare(b.name || "", "en", { sensitivity: "base" })
  );

  function el(tag, cls, text) {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = text;
    return node;
  }

  function addImageFallback(img, app) {
    img.onerror = () => {
      img.onerror = null;
      // Fall back to the registry emoji, then to the site favicon.
      if (app.icon) {
        img.replaceWith(el("span", "card-icon-emoji", app.icon));
      } else {
        img.src = "assets/favicon.svg";
      }
    };
  }

  function appLink(app, className) {
    const link = el("a", className);
    link.href = app.url || "apps/" + app.id + "/";
    link.target = "_blank";
    link.rel = "noopener";
    const url = new URL(link.href);
    const appPath = url.pathname.slice(appsPath.length);
    if (installedDirectory && url.origin === location.origin && url.pathname.startsWith(appsPath) &&
        /^[^/]+(?:\/(?:index\.html)?)?$/.test(appPath)) {
      // Use the directory URL even for registry entries without a trailing slash.
      const folder = appsPath + appPath.split("/")[0] + "/";
      if (!appPath.endsWith("/index.html")) url.pathname = folder;
      link.href = url.href;
      link.target = "_self";
      link.addEventListener("click", (event) => {
        if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey ||
            event.shiftKey || event.altKey) return;
        try { sessionStorage.setItem(launchKey, folder); } catch (error) {}
        event.preventDefault();
        location.assign(link.href);
      });
    }
    return link;
  }

  const optionsDialog = document.getElementById("app-options-dialog");
  const optionsTitle = document.getElementById("app-options-title");
  const optionsList = document.getElementById("app-options-list");

  function showAppOptions(app, alternatives) {
    optionsTitle.textContent = app.name;
    optionsList.replaceChildren(...[app, ...alternatives].map((option) => {
      const link = appLink(option, "app-option");
      link.append(el("strong", null, option.name), el("span", null, option.description));
      link.addEventListener("click", () => optionsDialog.close());
      return link;
    }));
    optionsDialog.showModal();
  }

  function card(app) {
    const status = app.status || "live";
    const clickable = status !== "soon";
    const alternatives = groupedApps.get(app.id);
    const node = clickable && !alternatives ? appLink(app, "card") :
      el(alternatives ? "button" : "div", "card" + (clickable ? "" : " disabled"));
    if (alternatives) {
      node.type = "button";
      node.setAttribute("aria-label", app.name);
      node.setAttribute("aria-haspopup", "dialog");
      node.setAttribute("aria-controls", optionsDialog.id);
      node.addEventListener("click", () => showAppOptions(app, alternatives));
    }

    const top = el("span", "card-top");
    const icon = el("span", "card-icon");
    icon.title = app.name;
    const img = document.createElement("img");
    img.src = app.iconUrl || "apps/" + app.id + "/icons/icon-192.png";
    img.alt = "";
    img.width = 40;
    img.height = 40;
    addImageFallback(img, app);
    icon.appendChild(img);
    top.appendChild(icon);
    top.appendChild(el("span", "badge " + status, STATUS_LABEL[status] || status));
    node.appendChild(top);

    node.appendChild(el(alternatives ? "span" : "h3", "card-title", app.name));
    node.appendChild(el(alternatives ? "span" : "p", "card-description", app.description || ""));

    const meta = el("span", "card-tags");
    (app.tags || []).forEach((tag) => meta.appendChild(el("span", "mini-tag", tag)));
    node.appendChild(meta);

    const item = el("div", "card-item");
    item.appendChild(node);
    if (clickable) {
      item.classList.add("pinnable");
      const pin = el("button", "pin-button");
      const pinned = pinnedApps.has(app.id);
      pin.type = "button";
      pin.dataset.appId = app.id;
      pin.setAttribute("aria-label", "Pin " + app.name);
      pin.setAttribute("aria-pressed", String(pinned));
      pin.title = (pinned ? "Unpin " : "Pin ") + app.name;
      pin.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 3h8v6l3 3v3H5v-3l3-3z"/><path d="M12 15v6"/></svg>';
      pin.addEventListener("click", () => {
        const hadFocus = document.activeElement === pin;
        if (pinnedApps.has(app.id)) {
          pinnedApps.delete(app.id);
        } else {
          pinnedApps.add(app.id);
        }
        try { localStorage.setItem(pinnedKey, JSON.stringify([...pinnedApps])); } catch (e) {}
        renderApps();
        if (hadFocus) {
          grid.querySelector(`.pin-button[data-app-id="${CSS.escape(app.id)}"]`)?.focus();
        }
      });
      item.appendChild(pin);
    }
    return item;
  }

  function renderApps() {
    const query = search.value.trim().toLowerCase();
    const hideBetaTag = activeTags.includes("Hide Beta");
    const categoryTags = activeTags.filter((tag) => tag !== "Hide Beta");
    const orderedApps = sortedApps.slice().sort((a, b) =>
      Number(pinnedApps.has(b.id)) - Number(pinnedApps.has(a.id))
    );
    grid.innerHTML = "";
    let shown = 0;
    orderedApps.forEach((app) => {
      const inTag =
        categoryTags.length === 0 || (app.tags || []).some((t) => categoryTags.indexOf(t) !== -1);
      const isBeta = (app.status || "live") === "beta";
      const matchesQuery = !query || [app, ...(groupedApps.get(app.id) || [])].some((option) =>
        [option.name, option.description, ...(option.tags || [])].join(" ").toLowerCase().includes(query)
      );
      if (inTag && (!hideBetaTag || !isBeta) && matchesQuery) {
        grid.appendChild(card(app));
        shown++;
      }
    });
    empty.hidden = shown !== 0;
  }

  search.addEventListener("input", renderApps);
  renderTags();
  renderApps();
})();
