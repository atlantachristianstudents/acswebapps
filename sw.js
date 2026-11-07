// Adless home-page service worker: lets the app directory open offline.
// - Navigations to the home page are network-first (new versions show up when online).
// - Other home-page files and the Inter font are stale-while-revalidate.
// - Everything under apps/ is left alone: each app has its own service worker and cache.
// Bump VERSION whenever index.html, manifest.json, sw.js or anything in SHELL changes.
const VERSION = "adless-home-v8";
const SHELL = [
  "./",
  "index.html",
  "manifest.json",
  "assets/style.css",
  "assets/apps.js",
  "assets/main.js",
  "assets/favicon.svg",
  "assets/icons/icon-192.png",
  "assets/icons/icon-512.png",
  "assets/icons/maskable-512.png",
  "assets/icons/apple-touch-icon.png"
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

const cacheable = (res) => res && (res.ok || res.type === "opaque");
const store = (req, res) => {
  if (cacheable(res)) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); }
  return res;
};

const networkFirst = (req) =>
  fetch(req).then((res) => store(req, res)).catch(() =>
    caches.match(req, { ignoreSearch: true }).then((hit) => hit || caches.match("index.html")));

const staleWhileRevalidate = (req) =>
  caches.match(req).then((hit) => {
    const net = fetch(req).then((res) => store(req, res)).catch(() => hit || Response.error());
    return hit || net;
  });

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const fonts = url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com";
  if (fonts) return e.respondWith(staleWhileRevalidate(req));
  if (url.origin !== self.location.origin) return;
  // Leave the apps (and their own service workers) alone.
  const scopePath = new URL(self.registration.scope).pathname;
  if (url.pathname.startsWith(scopePath + "apps/")) return;
  e.respondWith(req.mode === "navigate" ? networkFirst(req) : staleWhileRevalidate(req));
});
