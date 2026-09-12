/* Service Worker do app de Gestão Ergonômica — cache do app shell para uso offline. */
const CACHE_VERSION = 'ergopgr-v1';
const APP_SHELL = [
  './', './index.html', './manifest.webmanifest', './css/styles.css',
  './js/db.js', './js/ui.js', './js/risco.js', './js/blocos-aep.js', './js/metodos-ergo.js',
  './js/sync.js', './js/report.js', './js/app.js', './js/app-pgr.js', './js/app-situacao.js',
  './js/app-aep.js', './js/app-aet.js', './js/app-correlacao.js', './js/app-plano.js', './js/app-config.js',
  './icons/icon-192.png', './icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_VERSION).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  if (req.url.includes('script.google.com')) return;
  event.respondWith(
    caches.match(req).then((cached) => cached || fetch(req).then((resp) => {
      if (resp && resp.ok && req.url.startsWith(self.location.origin)) {
        const clone = resp.clone();
        caches.open(CACHE_VERSION).then((cache) => cache.put(req, clone));
      }
      return resp;
    }).catch(() => caches.match('./index.html')))
  );
});
