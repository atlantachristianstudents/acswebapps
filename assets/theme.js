// Shared ACS Web Apps theme cookie and API.
// Apply the saved theme before first paint (no flash). Rise's theme list.
// Custom theme choices (colors + font) are stored in a second cookie,
// so they too persist across every app on the domain.
(function () {
  var D = "dawn",
    M = [
      "dawn",
      "paper",
      "sage",
      "ocean",
      "rose",
      "dusk",
      "midnight",
      "custom",
    ],
    T = "acswebapps-theme",
    C = "acswebapps-custom-theme";
  var VARS = [
    "bg",
    "text",
    "muted",
    "surface",
    "panel",
    "border",
    "accent",
    "on-accent",
    "selected",
    "focus",
  ];
  var FONTS = {
    serif: 'Georgia,"Iowan Old Style","Times New Roman",serif',
    sans: "Arial,Helvetica,sans-serif",
    rounded: '"Trebuchet MS",Arial,sans-serif',
    mono: '"Courier New",monospace',
  };
  var DEFAULTS = {
    bg: "#f4efe5",
    text: "#24302b",
    muted: "#596459",
    surface: "#fffdf8",
    panel: "#f9f6ee",
    border: "#c9c8bc",
    accent: "#44584b",
    "on-accent": "#ffffff",
    selected: "#e8eee4",
    focus: "#74876a",
    font: "serif",
  };
  function ck(name) {
    var v = "; " + document.cookie,
      p = v.split("; " + name + "=");
    var result = p.length === 2 ? p.pop().split(";").shift() : null;
    console.log("[theme] ck('" + name + "') =>", result || "(empty)");
    return result;
  }
  function set(name, value, days) {
    var e = new Date();
    e.setTime(e.getTime() + days * 24 * 60 * 60 * 1000);
    var cookieStr =
      name +
      "=" +
      encodeURIComponent(value) +
      "; expires=" +
      e.toUTCString() +
      "; path=/; sameSite=strict";
    console.log("[theme] set('" + name + "', '" + value + "')");
    document.cookie = cookieStr;
  }
  function readCustom() {
    try {
      var raw = ck(C);
      if (!raw) return null;
      var obj = JSON.parse(decodeURIComponent(raw));
      if (obj && typeof obj === "object") return obj;
    } catch (e) {}
    return null;
  }
  function paint(theme, custom) {
    var root = document.documentElement;
    if (M.indexOf(theme) === -1) theme = D;
    root.setAttribute("data-theme", theme);
    // Clear any inline overrides from a previous custom theme.
    for (var i = 0; i < VARS.length; i++)
      root.style.removeProperty("--" + VARS[i]);
    root.style.removeProperty("--app-font");
    root.style.removeProperty("color-scheme");

    // Apply preset theme colors directly
    var PRESETS = {
      dawn: {
        bg: "#f4efe5",
        text: "#24302b",
        muted: "#596459",
      },
      paper: {
        bg: "#fafafa",
        text: "#30343b",
        muted: "#687078",
      },
      sage: {
        bg: "#e8eee5",
        text: "#293b2d",
        muted: "#596b5c",
      },
      ocean: {
        bg: "#e8f0f4",
        text: "#263b49",
        muted: "#587080",
      },
      rose: {
        bg: "#f5eae8",
        text: "#49343a",
        muted: "#795d64",
      },
      dusk: {
        bg: "#292634",
        text: "#ffffff",
        muted: "#c5bfd0",
      },
      midnight: {
        bg: "#141c24",
        text: "#ffffff",
        muted: "#b7c5d1",
      },
    };

    if (theme !== "custom" && PRESETS[theme]) {
      Object.keys(PRESETS[theme]).forEach(function (key) {
        root.style.setProperty("--" + key, PRESETS[theme][key]);
      });
    }

    if (theme === "custom") {
      custom = custom || DEFAULTS;
      for (var i = 0; i < VARS.length; i++) {
        var val = custom[VARS[i]];
        if (val) root.style.setProperty("--" + VARS[i], val);
      }
      root.style.setProperty("--app-font", FONTS[custom.font] || FONTS.serif);
      var bg = custom.bg || "#f4efe5";
      var dark =
        parseInt(bg.slice(1, 3), 16) * 0.299 +
          parseInt(bg.slice(3, 5), 16) * 0.587 +
          parseInt(bg.slice(5, 7), 16) * 0.114 <
        128;
      root.style.colorScheme = dark ? "dark" : "light";
    }
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta)
      meta.setAttribute(
        "content",
        theme === "custom"
          ? (custom && custom.bg) || "#f4efe5"
          : {
              dawn: "#f4efe5",
              paper: "#fafafa",
              sage: "#e8eee5",
              ocean: "#e8f0f4",
              rose: "#f5eae8",
              dusk: "#292634",
              midnight: "#141c24",
            }[theme] || "#f4efe5",
      );
  }
  var saved = ck(T),
    cust = readCustom();
  // Apply theme after page fully loads (no flash, ensures DOM is ready).
  // A 1-second delay lets all app scripts initialize before the theme takes effect.
  function applySavedTheme() {
    window.acswebappsTheme.apply(saved || D);
    console.log(
      "[theme] init: applied theme='" +
        (saved || D) +
        "' via apply() [after page load]",
    );
  }
  window.addEventListener("load", function () {
    applySavedTheme();
    setTimeout(applySavedTheme, 10);
  });
  window.acswebappsTheme = {
    names: M,
    fonts: FONTS,
    defaults: DEFAULTS,
    get: function () {
      return ck(T) || D;
    },
    getCustom: function () {
      return readCustom();
    },
    set: function (t) {
      set(T, t, 365);
      console.log("[theme] set('" + t + "')");
      set(T, t, 365);
      console.log("[theme] after set, cookie =", document.cookie);
    },
    setCustom: function (c) {
      console.log("[theme] setCustom()");
      set(C, JSON.stringify(c || DEFAULTS), 365);
    },
    apply: function (t) {
      console.log("[theme] apply('" + t + "')");
      paint(t, t === "custom" ? readCustom() : null);
    },
    preview: function (t, c) {
      console.log("[theme] preview('" + t + "')");
      paint(t, t === "custom" ? c || readCustom() : null);
    },
  };
  applySavedTheme;
})();
