/* MARCO-XMD — Service Worker PWA */
const CACHE_NAME = 'marco-xmd-v2.0.0';
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/admin.html',
  '/games.html',
  '/404.html',
  '/status.html',
  '/manifest.json',
  '/media/logo192.png',
  '/media/logo512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS).catch(() => {}))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  // Ne pas mettre en cache les routes API (données dynamiques)
  if (url.pathname.startsWith('/api/') ||
      url.pathname.startsWith('/admin/') ||
      url.pathname.startsWith('/voice_studio/tmp/') ||
      url.pathname.startsWith('/video_downloader/tmp/')) {
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res && res.status === 200 && res.type === 'basic') {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          }
          return res;
        })
        .catch(() => cached || caches.match('/404.html'));
      return cached || network;
    })
  );
});
