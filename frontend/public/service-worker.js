/* MARCO-XMD — Service Worker PWA */
const CACHE_NAME = 'marco-cache-2026-10-05-v7';
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/auth.html',
  '/profile.html',
  '/history.html',
  '/account.js',
  '/pwa-update.js',
  '/vendor/supabase/supabase.js',
  '/vendor/fontawesome/css/all.min.css',
  '/vendor/fontawesome/webfonts/fa-solid-900.woff2',
  '/vendor/fontawesome/webfonts/fa-brands-400.woff2',
  '/vendor/fontawesome/webfonts/fa-regular-400.woff2',
  '/admin.html',
  '/games.html',
  '/404.html',
  '/status.html',
  '/manifest.json',
  '/translations.js',
  '/i18n.js',
  '/app-banner.js',
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

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch {}
  const title = data.title || 'MARCO-XMD';
  const options = {
    body: data.body || 'Vous avez une nouvelle notification.',
    icon: data.icon || '/media/logo192.png',
    badge: '/media/logo192.png',
    tag: 'marco-xmd-notification',
    renotify: true,
    data: { url: data.url || '/' }
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || '/', self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((client) => 'focus' in client);
      if (existing) {
        existing.navigate(target);
        return existing.focus();
      }
      return self.clients.openWindow(target);
    })
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.pathname.startsWith('/api/') ||
      url.pathname.startsWith('/admin/') ||
      url.pathname.startsWith('/voice_studio/tmp/') ||
      url.pathname.startsWith('/video_downloader/tmp/')) return;

  const networkFirst = ['/auth.html','/account.js','/vendor/supabase/supabase.js','/service-worker.js'].includes(url.pathname);
  event.respondWith(networkFirst ? fetch(req).then(res => { if (res.ok) caches.open(CACHE_NAME).then(c => c.put(req, res.clone())); return res; }).catch(() => caches.match(req).then(c => c || caches.match('/404.html'))) : caches.match(req).then(cached => fetch(req).then(res => { if (res.ok && res.type === 'basic') caches.open(CACHE_NAME).then(c => c.put(req, res.clone())); return res; }).catch(() => cached || caches.match('/404.html')) || cached));
});
