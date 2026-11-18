const CACHE = "tunes-v24";
const FILES = ["./", "index.html", "manifest.webmanifest", "icons/icon.svg", "icons/icon-192.png", "icons/icon-512.png", "icons/maskable-192.png", "icons/maskable-512.png", "icons/apple-touch-icon.png"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES.map(function(file){return new Request(file,{cache:"reload"})}))).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith("tunes-v") && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  e.respondWith(caches.match(e.request, {ignoreSearch: true}).then(hit => hit || fetch(e.request).catch(() => e.request.mode === "navigate" ? caches.match("index.html") : Response.error())));
});

// Manual upgrades requested from this app’s help/About panel.
self.addEventListener("message",function(event){if(event.data&&event.data.type==="ACS_GET_VERSION"&&event.ports[0])event.ports[0].postMessage({version:CACHE});if(event.data&&event.data.type==="ACS_SKIP_WAITING")event.waitUntil(self.skipWaiting())});
