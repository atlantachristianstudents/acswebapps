// Bump the version whenever a cached app asset changes.
const CACHE = 'logostype-v196';
const ASSETS = ['./', 'index.html', 'reading.html', 'reading.js', 'dist/index.html', 'dist/reading.html', 'app.js', 'data.js', 'history-store.js', 'replay.js', 'rooms.js', 'race.js',
  'scripture-references.js', 'scripture-text.js', 'vendor/peerjs.min.js',
  'icons/mode-time.svg', 'icons/mode-words.svg', 'icons/mode-verse.svg', 'icons/mode-custom.svg',
  'pwa.js', 'navigation.js', 'themes.css', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)));
});

// New versions activate after existing app windows close, keeping each session consistent.
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) {
      if (key.startsWith('logostype-') && key !== CACHE) await caches.delete(key);
    }
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;
  const root = new URL('./', self.location.href);
  const asset = ASSETS.find(path => new URL(path, root).pathname === url.pathname);
  // A recovery request must bypass the offline copy, which may be outdated.
  if (url.searchParams.has('retry')) return;
  if (!asset && event.request.mode !== 'navigate') return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(new URL(asset || 'index.html', root));
    return cached || fetch(event.request);
  })());
});
