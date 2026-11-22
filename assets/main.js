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
  const THEME_NAMES = ["light", "dark", "dawn", "paper", "sage", "ocean", "rose", "dusk", "midnight"];

  function currentTheme() {
    return root.getAttribute("data-theme") || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  }

  function applyTheme(theme, persist) {
    root.setAttribute("data-theme", theme);
    if (themeNameEl) themeNameEl.textContent = theme.charAt(0).toUpperCase() + theme.slice(1);
    if (persist) {
      try { localStorage.setItem("acswebapps-theme", theme); } catch (e) {}
    }
  }

  let savedTheme = null;
  try { savedTheme = localStorage.getItem("acswebapps-theme"); } catch (e) {}
  if (savedTheme && THEME_NAMES.includes(savedTheme)) {
    applyTheme(savedTheme, false);
  } else if (savedTheme === "dark") {
    applyTheme("dark", false);
  } else {
    applyTheme(window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light", false);
  }

  function previewTheme(name) {
    applyTheme(name, false);
    document.querySelectorAll("#theme-presets [data-theme-choice]").forEach((btn) => {
      btn.setAttribute("aria-pressed", String(btn.dataset.themeChoice === name));
    });
  }

  if (themeToggle) {
    themeToggle.addEventListener("click", () => {
      if (!themeDialog) return;
      previewTheme(currentTheme());
      themeDialog.showModal();
    });
  }

  if (themePresets) {
    themePresets.addEventListener("click", (event) => {
      const btn = event.target.closest("[data-theme-choice]");
      if (btn) previewTheme(btn.dataset.themeChoice);
    });
  }

  if (saveThemeBtn) {
    saveThemeBtn.addEventListener("click", () => {
      applyTheme(currentTheme(), true);
      themeDialog.close();
    });
  }

  if (themeDialog) {
    themeDialog.addEventListener("cancel", () => applyTheme(currentTheme(), false));
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
      !event.ctrlKey &&
      !event.metaKey &&
      !event.altKey &&
      document.activeElement !== search &&
      !document.activeElement?.closest("dialog") &&
      !["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName)
    ) {
      if (!minimal && (event.key === "/" || event.key === "?")) {
        event.preventDefault();
        search?.focus();
      }
      if (!event.shiftKey && !event.repeat && !event.isComposing && !document.activeElement?.isContentEditable) {
        if (event.key === "m") {
          event.preventDefault();
          toggleMinimalDisplay();
        }
        if (event.key === "c" && !minimal && compactToggle) {
          event.preventDefault();
          compactToggle.click();
        }
      }
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
  const minimalToggle = document.getElementById("minimal-display-toggle");
  const layoutKey = "acswebapps-layout";
  const minimalKey = "acswebapps-minimal-display";
  let compact = false;
  let minimal = false;

  try {
    compact = localStorage.getItem(layoutKey) === "compact";
    minimal = localStorage.getItem(minimalKey) === "true";
  } catch (e) {}

  function applyLayout() {
    root.classList.toggle("minimal-display", minimal);
    grid.classList.toggle("compact", compact || minimal);
    compactToggle?.setAttribute("aria-pressed", String(compact));
    minimalToggle.textContent = minimal ? "Exit minimal display" : "Enter minimal display";
  }

  function toggleMinimalDisplay() {
    minimal = !minimal;
    applyLayout();
    if (activeTags.length || search.value.trim()) renderApps();
    try { localStorage.setItem(minimalKey, String(minimal)); } catch (e) {}
  }

  applyLayout();
  minimalToggle.addEventListener("click", () => {
    toggleMinimalDisplay();
    helpDialog.close();
  });
  if (compactToggle) {
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
    const query = minimal ? "" : search.value.trim().toLowerCase();
    const hideBetaTag = !minimal && activeTags.includes("Hide Beta");
    const categoryTags = minimal ? [] : activeTags.filter((tag) => tag !== "Hide Beta");
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
