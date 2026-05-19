const CACHE_NAME = 'musicas-v5';
const ASSETS = [
  '/Musicas/index.html',
  '/Musicas/manifest.json',
  '/Musicas/icon-192.png',
  '/Musicas/icon-512.png',
  '/Musicas/',
];

// Instala e faz cache de todos os assets essenciais
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Ativa e remove caches antigos
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Estratégia: Cache-First para assets do app, Network-First para o resto
self.addEventListener('fetch', event => {
  const url = event.request.url;

  // Ignora blob: e chrome-extension:
  if (url.startsWith('blob:') || url.startsWith('chrome-extension:')) return;
  // Ignora requisições não-GET
  if (event.request.method !== 'GET') return;

  // Para assets do próprio app: Cache-First (garante funcionamento offline)
  if (url.includes('/Musicas/')) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          if (response && response.status === 200 && response.type !== 'opaque') {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        }).catch(() => {
          // Offline: retorna o index.html para navegação
          return caches.match('/Musicas/index.html');
        });
      })
    );
    return;
  }

  // Para outros recursos: tenta rede, cai no cache
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
