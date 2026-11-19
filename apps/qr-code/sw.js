// Offline cache for this app. Bump VERSION whenever you change index.html
// (or add/remove files), so installed devices pick up the new version.
var VERSION = "qr-code-v6";
var CACHE_PREFIX = VERSION.replace(/\d+$/, "");
var FILES = ["./", "index.html", "manifest.webmanifest", "icons/icon.svg", "vendor/qrcode.js"];

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(VERSION).then(function (c) { return c.addAll(FILES.map(function(file){return new Request(file,{cache:"reload"})})); }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k.startsWith(CACHE_PREFIX) && k !== VERSION; }).map(function (k) { return caches.delete(k); })).then(function () { return self.clients.claim(); })
    })
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

// Manual upgrades requested from this app's help/About panel.
self.addEventListener("message",function(event){if(event.data&&event.data.type==="ACS_GET_VERSION"&&event.ports[0])event.ports[0].postMessage({version:VERSION});if(event.data&&event.data.type==="ACS_SKIP_WAITING")event.waitUntil(self.skipWaiting())});