var VERSION = "verse-review-v12";
var FILES = ["./", "index.html", "manifest.webmanifest", "icons/icon.svg"];
self.addEventListener("install", function (e) { e.waitUntil(caches.open(VERSION).then(function (c) { return c.addAll(FILES.map(function(file){return new Request(file,{cache:"reload"})})); }).then(function () { return self.skipWaiting(); })); });
self.addEventListener("activate", function (e) { e.waitUntil(caches.keys().then(function (keys) { return Promise.all(keys.filter(function (k) { return k !== VERSION; }).map(function (k) { return caches.delete(k); })); }).then(function () { return self.clients.claim(); })); });
self.addEventListener("fetch", function (e) { if (e.request.method !== "GET") return; e.respondWith(caches.match(e.request, {ignoreSearch:true}).then(function (hit) { return hit || fetch(e.request).catch(function () { return e.request.mode === "navigate" ? caches.match("index.html") : Response.error(); }); })); });

// Manual upgrades requested from this app’s help/About panel.
self.addEventListener("message",function(event){if(event.data&&event.data.type==="ACS_GET_VERSION"&&event.ports[0])event.ports[0].postMessage({version:VERSION});if(event.data&&event.data.type==="ACS_SKIP_WAITING")event.waitUntil(self.skipWaiting())});
