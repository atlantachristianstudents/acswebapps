// Songbook offline cache. Bump VERSION when you replace index.html.
var VERSION = "songbook-v14";
var FILES = ["./", "./index.html", "./manifest.webmanifest", "./icons/icon.svg"];
self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(VERSION).then(function (c) { return c.addAll(FILES.map(function(file){return new Request(file,{cache:"reload"})})); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k.startsWith("songbook-v") && k !== VERSION; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener("fetch", function (e) {
  var r = e.request;
  if (r.method !== "GET" || new URL(r.url).origin !== location.origin) return;   // leave Songbase sync alone
  e.respondWith(caches.match(r, { ignoreSearch: true }).then(function (hit) {
    return hit || fetch(r).catch(function () { return caches.match("./index.html"); });
  }));
});

// Manual upgrades requested from this app’s help/About panel.
self.addEventListener("message",function(event){if(event.data&&event.data.type==="ACS_GET_VERSION"&&event.ports[0])event.ports[0].postMessage({version:VERSION});if(event.data&&event.data.type==="ACS_SKIP_WAITING")event.waitUntil(self.skipWaiting())});
