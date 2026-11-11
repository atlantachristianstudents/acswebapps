// Show Songs service worker: lets the app open and work offline.
// - The page itself is network-first, so a new version shows up as soon as you are online.
// - Icons, manifest and the Google Fonts files are served from cache and refreshed in the background.
// Bump VERSION to drop old caches.
var VERSION = 'big-text-v93';
var SHELL = [
  './',
  './index.html',
  './songbase_all.json',
  './manifest.webmanifest',
  './icons/icon.svg',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(VERSION)
      .then(function (c) { return c.addAll(SHELL); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(keys.filter(function (k) { return k !== VERSION; }).map(function (k) { return caches.delete(k); }));
      })
      .then(function () { return self.clients.claim(); })
  );
});

function cacheable(res) { return res && (res.ok || res.type === 'opaque'); }

function networkFirst(req) {
  return fetch(req).then(function (res) {
    if (cacheable(res)) { var copy = res.clone(); caches.open(VERSION).then(function (c) { c.put(req, copy); }); }
    return res;
  }).catch(function () {
    return caches.match(req).then(function (hit) { return hit || (req.mode === 'navigate' ? caches.match('./index.html') : Response.error()); });
  });
}

function staleWhileRevalidate(req) {
  return caches.match(req).then(function (hit) {
    var net = fetch(req).then(function (res) {
      if (cacheable(res)) { var copy = res.clone(); caches.open(VERSION).then(function (c) { c.put(req, copy); }); }
      return res;
    }).catch(function () { return hit; });
    return hit || net;
  });
}

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  var fonts = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (url.origin === self.location.origin) {
    var library = url.pathname === new URL('./songbase_all.json', self.location.href).pathname;
    e.respondWith(req.mode === 'navigate' || library ? networkFirst(req) : staleWhileRevalidate(req));
  } else if (fonts) {
    e.respondWith(staleWhileRevalidate(req));
  }
});
