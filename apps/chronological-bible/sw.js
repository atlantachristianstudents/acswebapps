const CACHE = 'chronological-bible-v52';
const FILES = ['./', 'index.html', 'style.css', 'app.js', 'order.js', 'manifest.webmanifest', 'icons/icon.svg'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES.map(function(file){return new Request(file,{cache:"reload"})}))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys
    .filter(k => (k.startsWith('rcv-chronological-v') || k.startsWith('chronological-bible-v')) && k !== CACHE)
    .map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin ||
      !url.pathname.startsWith(new URL(self.registration.scope).pathname)) return;
  e.respondWith(caches.open(CACHE).then(c => c.match(e.request)).then(r => r || fetch(e.request)));
});

// Manual upgrades requested from this app’s help/About panel.
self.addEventListener("message",function(event){if(event.data&&event.data.type==="ACS_GET_VERSION"&&event.ports[0])event.ports[0].postMessage({version:CACHE});if(event.data&&event.data.type==="ACS_SKIP_WAITING")event.waitUntil(self.skipWaiting())});
