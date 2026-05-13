const CACHE_NAME = 'kromuz-v2-cache-v1';
const urlsToCache = [
  '/',
  '/simulador',
  '/manifest.json',
  '/icon-192x192.png',
  '/icon-512x512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Cache PWA aberto');
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Retorna o cache se houver, caso contrário, tenta a rede
        if (response) {
          return response;
        }
        return fetch(event.request).catch(() => {
          // Fallback genérico para quando estiver offline e não houver cache
          if (event.request.mode === 'navigate') {
            return caches.match('/simulador');
          }
        });
      })
  );
});

self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
