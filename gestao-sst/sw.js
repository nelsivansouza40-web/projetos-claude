/*
 * Service Worker: guarda os arquivos do sistema no dispositivo para abrir sem
 * internet quando publicado em um endereço http(s). Os dados ficam no IndexedDB.
 */
const CACHE_VERSION = 'gsst-v2';
const APP_SHELL = [
  './', './index.html', './manifest.webmanifest', './css/app.css',
  './js/util.js', './js/db.js', './js/config.js', './js/schema.js', './js/calc.js', './js/charts.js',
  './js/forms.js', './js/modules.js', './js/dashboards.js', './js/reports.js', './js/xlsx-import.js',
  './js/backup.js', './js/demo.js', './js/sync.js', './js/app.js', './icons/icon-192.png', './icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_VERSION).then((c) => c.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then((hit) => hit || fetch(event.request).then((resp) => {
      if (resp.ok && new URL(event.request.url).origin === location.origin) {
        const copia = resp.clone();
        caches.open(CACHE_VERSION).then((c) => c.put(event.request, copia));
      }
      return resp;
    }).catch(() => caches.match('./index.html')))
  );
});
