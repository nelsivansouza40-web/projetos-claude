/*
 * Service Worker: garante que o aplicativo abra e funcione mesmo sem
 * internet, servindo os arquivos a partir do cache local do dispositivo.
 * Dados de inspeções e fotos ficam no IndexedDB (não neste cache).
 */
const CACHE_VERSION = 'ssma-v23';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/styles.css',
  './js/db.js',
  './js/checklists.js',
  './js/diagnostico-checklist.js',
  './js/ptapr-checklist.js',
  './js/certificados-tipos.js',
  './js/pet-checklist.js',
  './js/sync.js',
  './js/report.js',
  './js/dds.js',
  './js/diagnostico.js',
  './js/cipa.js',
  './js/ptapr.js',
  './js/certificados.js',
  './js/pet.js',
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

  // Nunca intercepta chamadas de sincronização (vão direto para a rede).
  if (req.url.includes('script.google.com')) return;

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req)
        .then((resp) => {
          if (resp && resp.ok && req.url.startsWith(self.location.origin)) {
            const clone = resp.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(req, clone));
          }
          return resp;
        })
        .catch(() => caches.match('./index.html'));
    })
  );
});
