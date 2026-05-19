const CACHE = 'repovision-v1';
const URLS = [
  '/',
  '/app.js',
  '/styles.css',
  '/manifest.json',
  '/icon-192.svg',
  '/icon-512.svg',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(URLS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
});

self.addEventListener('fetch', (e) => {
  const { request } = e;
  if (request.method !== 'GET') return;

  // API calls — network first, cache fallback
  if (request.url.includes('/api/')) {
    e.respondWith(
      fetch(request).then((r) => {
        const clone = r.clone();
        caches.open(CACHE).then((c) => c.put(request, clone));
        return r;
      }).catch(() => caches.match(request))
    );
    return;
  }

  // Static assets — cache first
  e.respondWith(
    caches.match(request).then((r) => r || fetch(request).then((r) => {
      if (r.ok) {
        const clone = r.clone();
        caches.open(CACHE).then((c) => c.put(request, clone));
      }
      return r;
    }))
  );
});
