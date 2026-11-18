// Cache the app shell. Downloaded packs live exclusively in IndexedDB.
const VERSION = "define-v12";
const SCOPE = new URL(self.registration.scope);
const PREFIX = "define:" + SCOPE.pathname + ":";
const CACHE = PREFIX + VERSION;
const FILES = ["./", "index.html", "dictionary.js", "index.js", "manifest.webmanifest", "icons/icon.svg",
    "icons/icon-192.png", "icons/icon-512.png", "data/fixtures/starter.js",
  "sounds/catalog.js", "sounds/apple.mp3", "sounds/bank.mp3", "sounds/serendipity.mp3"];
const assets = new Set(FILES.map(file => new URL(file, SCOPE).pathname));

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(
    FILES.map(file => new Request(new URL(file, SCOPE), { cache: "reload" }))
  )).then(() => self.skipWaiting()));
});

self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(name => name.startsWith(PREFIX) && name !== CACHE).map(name => caches.delete(name))
  )).then(() => self.clients.claim()));
});

self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== SCOPE.origin || !assets.has(url.pathname)) return;
  event.respondWith(caches.open(CACHE).then(async cache => {
    const cached = await cache.match(url, { ignoreSearch: true });
    if (url.search && event.request.mode === "navigate") {
      return fetch(event.request).catch(() => cached || Response.error());
    }
    const range = event.request.headers.get("Range");
    if (cached && range && url.pathname.endsWith(".mp3")) {
      const match = /^bytes=(\d+)-(\d*)$/.exec(range);
      const total = await cached.arrayBuffer();
      const start = match ? Number(match[1]) : total.byteLength;
      const end = match?.[2] ? Math.min(Number(match[2]), total.byteLength - 1) : total.byteLength - 1;
      if (start > end) return new Response(null, {status:416, headers:{"Content-Range":"bytes */" + total.byteLength}});
      return new Response(total.slice(start, end + 1), {status:206, headers:{
        "Content-Type":"audio/mpeg",
        "Content-Range":`bytes ${start}-${end}/${total.byteLength}`,
        "Content-Length":String(end - start + 1),
        "Accept-Ranges":"bytes"
      }});
    }
    if (cached) return cached;
    const response = await fetch(event.request);
    if (response.ok && !url.search && !range) await cache.put(url, response.clone()).catch(() => {});
    return response;
  }));
});

self.addEventListener("message", event => {
  if (event.data?.type === "ACS_GET_VERSION" && event.ports[0]) event.ports[0].postMessage({ version: VERSION });
  if (event.data?.type === "ACS_SKIP_WAITING") event.waitUntil(self.skipWaiting());
});
