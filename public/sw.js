// Service worker: the app opens offline with the last agenda received.
// Network first everywhere, so as never to show an old version when the server answers;
// the cache is only a fallback. Trips, geocoding and refresh stay online only:
// a trip computed yesterday would be wrong today.
const CACHE = "jcb-v2"; // v2: files tidied (css/, js/, assets/icons/); changing the name purges the old cache
const SHELL = [
  "./", "index.html", "css/style.css", "js/app.js", "js/explore.js", "manifest.webmanifest", "favicon.svg",
  "vendor/leaflet/leaflet.css", "vendor/leaflet/leaflet.js", "vendor/fonts/outfit-latin.woff2",
  "assets/icons/icon-192.png", "assets/icons/icon.svg",
];

self.addEventListener("install", (ev) => {
  ev.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (ev) => {
  ev.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

async function networkFirst(req, key = req) {
  const cache = await caches.open(CACHE);
  try {
    const res = await fetch(req);
    if (res.ok) cache.put(key, res.clone());
    return res;
  } catch (err) {
    const hit = await cache.match(key, { ignoreSearch: true });
    if (hit) return hit;
    throw err;
  }
}

self.addEventListener("fetch", (ev) => {
  const req = ev.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin) return; // map tiles, source images
  if (url.pathname.endsWith("/api/events")) {
    // flags the fallback response so the interface says it is offline
    return ev.respondWith(
      fetch(req)
        .then(async (res) => {
          if (res.ok) (await caches.open(CACHE)).put(req, res.clone());
          return res;
        })
        .catch(async () => {
          const hit = await caches.match(req);
          if (!hit) throw new Error("hors ligne");
          const body = await hit.json();
          return new Response(JSON.stringify({ ...body, refreshing: false, offline: true }), { headers: { "Content-Type": "application/json" } });
        }),
    );
  }
  if (url.pathname.includes("/api/")) return;
  if (req.mode === "navigate") return ev.respondWith(networkFirst(req, new URL("index.html", self.registration.scope).href));
  ev.respondWith(networkFirst(req));
});
