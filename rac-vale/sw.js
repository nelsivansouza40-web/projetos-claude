/*
 * Service Worker: garante que o aplicativo abra e funcione mesmo sem
 * internet, servindo os arquivos a partir do cache local do dispositivo.
 * Auditorias e fotos ficam no IndexedDB (não neste cache).
 */
const CACHE_VERSION = 'rac-campo-v5';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/styles.css',
  './js/db.js',
  './js/checklist.js',
  './js/relatorio.js',
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
  if (req.method !== 'GET') return;

  event.respondWith(
    caches.open(CACHE_VERSION).then((cache) =>
      cache.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req)
          .then((resp) => {
            if (resp && resp.ok && req.url.startsWith(self.location.origin)) {
              cache.put(req, resp.clone());
            }
            return resp;
          })
          .catch(() => cache.match('./index.html'));
      })
    )
  );
});
