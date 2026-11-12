// Offline cache for this app. Bump VERSION whenever you change index.html
// (or add/remove files), so installed devices pick up the new version.
var VERSION = "verse-designer-v10";
var FILES = ["./", "index.html", "manifest.webmanifest", "icons/icon.svg", "scripture-references.js"];

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(VERSION).then(function (c) { return c.addAll(FILES); }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== VERSION; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (e) {
  var request = e.request;
  if (request.method !== "GET") return;
  e.respondWith(
    caches.match(request, { ignoreSearch: true }).then(function (hit) {
      return hit || fetch(request).catch(function () {
        return request.mode === "navigate" ? caches.match("index.html") : Response.error();
      });
    })
  );
});
