// Verse Lookup offline cache. Bump VERSION when you replace index.html.
var VERSION = "verse-lookup-v3";
var FILES = ["./", "./index.html", "./display.html", "./manifest.webmanifest", "./icons/icon-192.png", "./icons/icon-512.png", "./icons/maskable-512.png", "./icons/apple-touch-icon.png"];
self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(VERSION).then(function (c) { return c.addAll(FILES); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k !== VERSION; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener("fetch", function (e) {
  var r = e.request;
  if (r.method !== "GET" || new URL(r.url).origin !== location.origin) return;   // leave the dictionary lookup alone
  e.respondWith(caches.match(r, { ignoreSearch: true }).then(function (hit) {
    return hit || fetch(r).catch(function () { return caches.match("./index.html"); });
  }));
});
