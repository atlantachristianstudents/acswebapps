/*
 * ACS Web Apps — home page behaviour: theme toggle, tag filters, search, app cards.
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

  /* ---------- keyboard shortcuts ---------- */
  document.addEventListener("keydown", (event) => {
    if (
      (event.key === "/" || event.key === "?") &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.altKey &&
      document.activeElement !== search &&
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

  /* ---------- cards ---------- */
  const STATUS_LABEL = { live: "Live", beta: "Beta", soon: "Coming soon" };
  const STATUS_ORDER = { live: 0, beta: 1, soon: 2 };
  const sortedApps = apps.slice().sort((a, b) =>
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

  function card(app) {
    const status = app.status || "live";
    const clickable = status !== "soon";
    const node = el(clickable ? "a" : "div", "card" + (clickable ? "" : " disabled"));
    if (clickable) {
      node.href = app.url || "apps/" + app.id + "/";
      node.target = "_blank";
      node.rel = "noopener";
      const url = new URL(node.href);
      const appPath = url.pathname.slice(appsPath.length);
      if (installedDirectory && url.origin === location.origin && url.pathname.startsWith(appsPath) &&
          /^[^/]+(?:\/(?:index\.html)?)?$/.test(appPath)) {
        // Use the directory URL even for registry entries without a trailing slash.
        const folder = appsPath + appPath.split("/")[0] + "/";
        if (!appPath.endsWith("/index.html")) url.pathname = folder;
        node.href = url.href;
        node.target = "_self";
        node.addEventListener("click", (event) => {
          if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey ||
              event.shiftKey || event.altKey) return;
          try { sessionStorage.setItem(launchKey, folder); } catch (error) {}
          event.preventDefault();
          location.assign(node.href);
        });
      }
    }

    const top = el("div", "card-top");
    const icon = el("span", "card-icon");
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

    node.appendChild(el("h3", null, app.name));
    node.appendChild(el("p", null, app.description || ""));

    const meta = el("div", "card-tags");
    (app.tags || []).forEach((tag) => meta.appendChild(el("span", "mini-tag", tag)));
    node.appendChild(meta);
    return node;
  }

  function renderApps() {
    const query = search.value.trim().toLowerCase();
    const hideBetaTag = activeTags.indexOf("Hide Beta") !== -1;
    grid.innerHTML = "";
    let shown = 0;
    sortedApps.forEach((app) => {
      const categoryTags = activeTags.filter((t) => t !== "Hide Beta");
      const inTag =
        categoryTags.length === 0 || (app.tags || []).some((t) => categoryTags.indexOf(t) !== -1);
      const isBeta = (app.status || "live") === "beta";
      const haystack = (app.name + " " + (app.description || "") + " " + (app.tags || []).join(" ")).toLowerCase();
      if (inTag && (!hideBetaTag || !isBeta) && (!query || haystack.indexOf(query) !== -1)) {
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
