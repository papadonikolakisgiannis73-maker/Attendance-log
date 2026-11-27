// App-shell cache only. Bumping CACHE must NEVER clear localStorage / IndexedDB
// attendance keys (le-jardin-attendance-v1, roster, IDB full-backup-v1).
const CACHE_PREFIX = "le-jardin-tablet-";
const CACHE = "le-jardin-tablet-r1-v5";
const PRECACHE = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./employees.js",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            // Only drop old Le Jardin app-shell caches. Never touch other origin caches
            // or any user data stores (localStorage / IndexedDB are not Cache API).
            .filter((k) => k.startsWith(CACHE_PREFIX) && k !== CACHE)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;

  // Network-first for HTML/JS/CSS so shell updates land; cache fallback for offline.
  // Attendance data lives in localStorage/IndexedDB — not in these responses.
  const isShell =
    e.request.mode === "navigate" ||
    /\.(?:html|js|css|json)$/i.test(url.pathname) ||
    url.pathname.endsWith("/le-jardin/") ||
    url.pathname.endsWith("/le-jardin");

  if (isShell) {
    e.respondWith(
      fetch(e.request)
        .then((resp) => {
          if (resp && resp.ok) {
            const clone = resp.clone();
            caches.open(CACHE).then((c) => c.put(e.request, clone));
          }
          return resp;
        })
        .catch(() =>
          caches.match(e.request).then((cached) => cached || caches.match("./index.html"))
        )
    );
    return;
  }

  e.respondWith(
    caches.match(e.request).then(
      (cached) =>
        cached ||
        fetch(e.request)
          .then((resp) => {
            const clone = resp.clone();
            caches.open(CACHE).then((c) => c.put(e.request, clone));
            return resp;
          })
          .catch(() => caches.match("./index.html"))
    )
  );
});
