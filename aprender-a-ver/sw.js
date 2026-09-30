/*
 * Service Worker: guarda os arquivos do aplicativo no aparelho para que ele
 * abra e funcione sem internet. Desenhos e fotos ficam no IndexedDB.
 */
const CACHE_VERSION = 'aprender-a-ver-v5';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/styles.css',
  './js/util.js',
  './js/cabeca3d.js',
  './js/licoes.js',
  './js/realista.js',
  './js/retrato.js',
  './js/visual.js',
  './js/sims.js',
  './js/foto.js',
  './js/prancheta.js',
  './js/progresso.js',
  './js/app.js',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) =>
      Promise.all(APP_SHELL.map((url) =>
        fetch(url, { cache: 'reload' }).then((resp) => cache.put(url, resp))
      ))
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || !req.url.startsWith(self.location.origin)) return;
  event.respondWith(
    caches.open(CACHE_VERSION).then((cache) =>
      cache.match(req, { ignoreSearch: true }).then((cached) => {
        const rede = fetch(req).then((resp) => {
          if (resp && resp.ok) cache.put(req, resp.clone());
          return resp;
        }).catch(() => null);
        return cached || rede.then((resp) => resp || cache.match('./index.html'));
      })
    )
  );
});
