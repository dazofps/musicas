const CACHE_NAME = 'musicas-v6';
const ASSETS = [
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
];

// Instala e cacheia todos os assets essenciais
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Ativa e remove caches antigos
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// Cache-First: serve do cache, atualiza em background
self.addEventListener('fetch', event => {
  const url = event.request.url;

  // Ignora blob:, chrome-extension: e não-GET
  if (url.startsWith('blob:') || url.startsWith('chrome-extension:')) return;
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      // Serve do cache imediatamente se disponível
      if (cached) {
        // Atualiza o cache em background (stale-while-revalidate)
        fetch(event.request).then(response => {
          if (response && response.status === 200 && response.type !== 'opaque') {
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, response));
          }
        }).catch(() => {});
        return cached;
      }

      // Não está no cache: busca na rede e salva
      return fetch(event.request).then(response => {
        if (response && response.status === 200 && response.type !== 'opaque') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        // Offline sem cache: retorna o app principal
        return caches.match('./index.html');
      });
    })
  );
});
