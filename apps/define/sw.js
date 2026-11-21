// Cache the app shell. Downloaded packs live exclusively in IndexedDB.
importScripts("dictionary.js");

const VERSION = "define-v15";
const SCOPE = new URL(self.registration.scope);
const PREFIX = "define:" + SCOPE.pathname + ":";
const CACHE = PREFIX + VERSION;
const FILES = ["./", "index.html", "dictionary.js", "index.js", "manifest.webmanifest", "icons/icon.svg",
    "icons/icon-192.png", "icons/icon-512.png", "data/fixtures/starter.js",
  "sounds/catalog.js", "sounds/apple.mp3", "sounds/bank.mp3", "sounds/serendipity.mp3"];
const assets = new Set(FILES.map(file => new URL(file, SCOPE).pathname));

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(
    FILES.map(file => new Request(new URL(file, SCOPE), { cache: "reload" }))
  )).then(() => self.skipWaiting()));
});

self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(name => name.startsWith(PREFIX) && name !== CACHE).map(name => caches.delete(name))
  )).then(() => self.clients.claim()));
});

self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== SCOPE.origin || !assets.has(url.pathname)) return;
  event.respondWith(caches.open(CACHE).then(async cache => {
    const cached = await cache.match(url, { ignoreSearch: true });
    if (url.search && event.request.mode === "navigate") {
      return fetch(event.request).catch(() => cached || Response.error());
    }
    const range = event.request.headers.get("Range");
    if (cached && range && url.pathname.endsWith(".mp3")) {
      const match = /^bytes=(\d+)-(\d*)$/.exec(range);
      const total = await cached.arrayBuffer();
      const start = match ? Number(match[1]) : total.byteLength;
      const end = match?.[2] ? Math.min(Number(match[2]), total.byteLength - 1) : total.byteLength - 1;
      if (start > end) return new Response(null, {status:416, headers:{"Content-Range":"bytes */" + total.byteLength}});
      return new Response(total.slice(start, end + 1), {status:206, headers:{
        "Content-Type":"audio/mpeg",
        "Content-Range":`bytes ${start}-${end}/${total.byteLength}`,
        "Content-Length":String(end - start + 1),
        "Accept-Ranges":"bytes"
      }});
    }
    if (cached) return cached;
    const response = await fetch(event.request);
    if (response.ok && !url.search && !range) await cache.put(url, response.clone()).catch(() => {});
    return response;
  }));
});

self.addEventListener("message", event => {
  if (event.data?.type === "ACS_GET_VERSION" && event.ports[0]) {
    event.ports[0].postMessage({ version: VERSION, backgroundPacks: true });
  }
  if (event.data?.type === "ACS_SKIP_WAITING") event.waitUntil(self.skipWaiting());
});

async function finishBackgroundPack(event) {
  const registration = event.registration;
  const dictionary = self.OpenDictionary;
  await navigator.locks.request(dictionary.backgroundLock(SCOPE.href), async () => {
    const job = await dictionary.backgroundJob(SCOPE.href);
    if (job?.id !== registration.id || job.phase !== "downloading") return;
    const { id, edition, manifest } = job;
    const status = { id, edition };
    if (event.type === "backgroundfetchsuccess") {
      try {
        await dictionary.backgroundJob(SCOPE.href, { ...status, phase:"installing" });
        const records = new Map((await registration.matchAll()).map(record => [record.request.url, record]));
        await dictionary.installPack(manifest, edition, () => {}, undefined, async file => {
          const url = new URL("data/releases/" + file.path, SCOPE).href;
          const record = records.get(url);
          if (!record) throw Error("A file is missing from the background download.");
          return record.responseReady;
        });
        status.phase = "installed";
      } catch (error) {
        status.phase = "failed";
        status.error = error.message;
      }
    } else {
      status.phase = event.type === "backgroundfetchabort" ? "cancelled" : "failed";
      if (status.phase === "failed") {
        status.error = registration.failureReason === "quota-exceeded"
          ? "There is insufficient browser storage for this pack." : "The browser could not finish downloading the pack.";
      }
    }
    await dictionary.backgroundJob(SCOPE.href, status);
    for (const client of await self.clients.matchAll({type:"window"})) {
      client.postMessage({type:"DEFINE_BACKGROUND_PACK", ...status});
    }
  });
}

for (const type of ["backgroundfetchsuccess", "backgroundfetchfail", "backgroundfetchabort"]) {
  self.addEventListener(type, event => {
    if (event.registration.id.startsWith("define-pack:")) event.waitUntil(finishBackgroundPack(event));
  });
}

self.addEventListener("backgroundfetchclick", event => {
  if (!event.registration.id.startsWith("define-pack:")) return;
  event.waitUntil((async () => {
    const url = new URL("#offline", SCOPE).href;
    const clients = await self.clients.matchAll({type:"window"});
    const existing = clients.find(client => client.url === url);
    if (existing) await existing.focus();
    else await self.clients.openWindow(url);
  })());
});
