var VERSION="rise-v90";var FILES=["./","index.html","manifest.webmanifest","icons/icon.svg","icons/edit.svg","icons/delete.svg","icons/mark.svg","icons/theme.svg","icons/icon-192.png","icons/icon-512.png","icons/apple-touch-icon.png"];self.addEventListener("install",function(e){e.waitUntil(caches.open(VERSION).then(function(c){return c.addAll(FILES.map(function(file){return new Request(file,{cache:"reload"})}))}).then(function(){return self.skipWaiting()}))});
self.addEventListener("activate",function(e){e.waitUntil(caches.keys().then(function(keys){return Promise.all(keys.filter(function(k){return k!==VERSION}).map(function(k){return caches.delete(k)}))}).then(function(){return self.clients.claim()}))});
self.addEventListener("fetch",function(e){var r=e.request;if(r.method!=="GET")return;var u=new URL(r.url);if(u.origin!==location.origin)return;e.respondWith(caches.match(r,{ignoreSearch:true}).then(function(hit){return hit||fetch(r).catch(function(){return r.mode==="navigate"?caches.match("index.html"):Response.error()})}))});

self.addEventListener("message",function(e){if(e.data&&e.data.type==="SKIP_WAITING")self.skipWaiting();if(e.data&&e.data.type==="GET_VERSION"&&e.ports[0])e.ports[0].postMessage({version:VERSION})});

// Manual upgrades requested from this app’s help/About panel.
self.addEventListener("message",function(event){if(event.data&&event.data.type==="ACS_GET_VERSION"&&event.ports[0])event.ports[0].postMessage({version:VERSION});if(event.data&&event.data.type==="ACS_SKIP_WAITING")event.waitUntil(self.skipWaiting())});
