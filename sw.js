/* ============================================================
   Triagem Tecnica IA - Service Worker (cache offline / PWA)
   Coloque este arquivo na MESMA pasta do index.html.
   Estrategia: stale-while-revalidate.
   ============================================================ */
const CACHE = "triagem-tecnica-ia-v1";
const ASSETS = ["./", "./index.html", "./sw.js"];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS)).catch(() => {})
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // nao cachear externos (wa.me etc)

  event.respondWith(
    caches.open(CACHE).then((cache) =>
      cache.match(req).then((cached) => {
        const network = fetch(req)
          .then((resp) => {
            if (resp && resp.status === 200 && resp.type === "basic") {
              cache.put(req, resp.clone());
            }
            return resp;
          })
          .catch(() => cached);
        return cached || network;
      })
    )
  );
});
