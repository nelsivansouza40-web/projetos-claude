/*
 * A Auditoria de RAC mudou para https://nelsivansouza40-web.github.io/RAC-CAMPO/.
 * Este service worker substitui o antigo: apaga o cache da versão anterior
 * e se desinstala, para que a pasta passe a mostrar o aviso de mudança.
 */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const chaves = await caches.keys();
    await Promise.all(chaves.filter((k) => k.startsWith('rac-campo-')).map((k) => caches.delete(k)));
    await self.registration.unregister();
    const janelas = await self.clients.matchAll({ type: 'window' });
    janelas.forEach((c) => c.navigate(c.url));
  })());
});
