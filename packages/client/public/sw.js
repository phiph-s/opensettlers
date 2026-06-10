const CACHE = 'opensettlers-v1';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', () => self.clients.claim());

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  // Pass through socket.io and non-GET requests uncached
  if (e.request.method !== 'GET' || url.pathname.startsWith('/socket.io')) return;
  e.respondWith(
    caches.open(CACHE).then((cache) =>
      cache.match(e.request).then((cached) => {
        const fresh = fetch(e.request).then((res) => {
          if (res.ok) cache.put(e.request, res.clone());
          return res;
        });
        return cached ?? fresh;
      })
    )
  );
});
