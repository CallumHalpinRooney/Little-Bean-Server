// Offline shell: static assets are cached, API calls always go to the network.
const CACHE = 'meridian-v1';
const SHELL = [
  '/', '/index.html', '/css/app.css', '/icon.svg', '/manifest.webmanifest',
  '/js/app.js', '/js/data/store.js', '/js/data/demo.js', '/js/data/schema.js',
  '/js/analysis/stats.js', '/js/analysis/norms.js', '/js/analysis/sleep.js', '/js/analysis/training.js',
  '/js/analysis/readiness.js', '/js/analysis/discover.js', '/js/analysis/engine.js',
  '/js/ui/charts.js', '/js/ui/icons.js',
];
self.addEventListener('install', (e) => e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())));
self.addEventListener('activate', (e) => e.waitUntil(
  caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
));
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (url.origin !== location.origin || url.pathname.startsWith('/api/')) return;
  // Network first so updates land immediately; cache is the offline fallback.
  e.respondWith(fetch(e.request).then((res) => {
    const copy = res.clone();
    caches.open(CACHE).then((c) => c.put(e.request, copy));
    return res;
  }).catch(() => caches.match(e.request)));
});
