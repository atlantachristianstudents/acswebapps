(function () {
  "use strict";

  var apps = (window.APPS || []).slice();
  var grid = document.getElementById("grid");
  var tagsEl = document.getElementById("tags");
  var search = document.getElementById("search");
  var empty = document.getElementById("empty");
  var activeTag = "All";

  document.getElementById("year").textContent = new Date().getFullYear();

  /* ---------- theme ---------- */
  var root = document.documentElement;
  function setTheme(t) {
    root.setAttribute("data-theme", t);
    try { localStorage.setItem("adless-theme", t); } catch (e) {}
  }
  var saved = null;
  try { saved = localStorage.getItem("adless-theme"); } catch (e) {}
  if (saved) root.setAttribute("data-theme", saved);
  document.getElementById("theme-toggle").addEventListener("click", function () {
    var current = root.getAttribute("data-theme") ||
      (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    setTheme(current === "dark" ? "light" : "dark");
  });

  /* ---------- tags ---------- */
  var allTags = ["All"];
  apps.forEach(function (a) {
    (a.tags || []).forEach(function (t) {
      if (allTags.indexOf(t) === -1) allTags.push(t);
    });
  });

  function renderTags() {
    tagsEl.innerHTML = "";
    allTags.forEach(function (t) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "chip" + (t === activeTag ? " active" : "");
      b.textContent = t;
      b.setAttribute("aria-pressed", t === activeTag ? "true" : "false");
      b.addEventListener("click", function () {
        activeTag = t;
        renderTags();
        renderApps();
      });
      tagsEl.appendChild(b);
    });
  }

  /* ---------- cards ---------- */
  var STATUS_LABEL = { live: "Live", beta: "Beta", soon: "Coming soon" };

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function card(app) {
    var status = app.status || "live";
    var clickable = status !== "soon";
    var node = el(clickable ? "a" : "div", "card" + (clickable ? "" : " disabled"));
    if (clickable) {
      node.href = app.url || ("apps/" + app.id + "/index.html");
      node.target = "_blank";
      node.rel = "noopener";
    }

    var top = el("div", "card-top");
    var icon = el("span", "card-icon");
    var img = document.createElement("img");
    img.src = app.iconUrl || ("apps/" + app.id + "/icons/icon-192.png");
    img.alt = "";
    img.width = 40;
    img.height = 40;
    img.onerror = function () { img.onerror = null; img.src = "assets/favicon.png"; };
    icon.appendChild(img);
    top.appendChild(icon);
    top.appendChild(el("span", "badge " + status, STATUS_LABEL[status] || status));
    node.appendChild(top);

    node.appendChild(el("h3", null, app.name));
    node.appendChild(el("p", null, app.description || ""));

    var meta = el("div", "card-tags");
    (app.tags || []).forEach(function (t) { meta.appendChild(el("span", "mini-tag", t)); });
    node.appendChild(meta);
    return node;
  }

  function renderApps() {
    var q = search.value.trim().toLowerCase();
    grid.innerHTML = "";
    var shown = 0;
    apps.forEach(function (a) {
      var inTag = activeTag === "All" || (a.tags || []).indexOf(activeTag) !== -1;
      var hay = (a.name + " " + (a.description || "") + " " + (a.tags || []).join(" ")).toLowerCase();
      if (inTag && (!q || hay.indexOf(q) !== -1)) {
        grid.appendChild(card(a));
        shown++;
      }
    });
    empty.hidden = shown !== 0;
  }

  search.addEventListener("input", renderApps);
  renderTags();
  renderApps();
})();
