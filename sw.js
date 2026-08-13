/* Service worker de Asedio: hace que el juego se pueda instalar y que
   ande sin internet. Va a la red primero, así una versión nueva llega
   sola; si no hay conexión, sirve lo cacheado. */
const CACHE = "asedio-v1";
const ASSETS = [
  "./", "./index.html", "./manifest.json",
  "./css/style.css", "./css/menu.css",
  "./js/data.js", "./js/progreso.js", "./js/render.js",
  "./js/game.js", "./js/pagos.js", "./js/ui.js",
  "./icons/icon-192.png", "./icons/icon-512.png",
  "./icons/icon-maskable-512.png", "./icons/apple-touch-icon.png"
];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  if(e.request.method !== "GET") return;
  e.respondWith(
    fetch(e.request)
      .then(r => {
        const copia = r.clone();
        caches.open(CACHE).then(c => c.put(e.request, copia)).catch(() => {});
        return r;
      })
      .catch(() => caches.match(e.request).then(r => r || caches.match("./index.html")))
  );
});
