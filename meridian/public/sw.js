// Paths are relative so the app works at a domain root or in a sub-folder (GitHub Pages).
// Offline shell: static assets are cached, API calls always go to the network.
const CACHE = 'meridian-v8';
const SHELL = [
  './', './index.html', './css/app.css', './icon.svg', './manifest.webmanifest',
  './js/app.js', './js/data/store.js', './js/data/demo.js', './js/data/demo-runs.js', './js/analysis/runs.js', './js/analysis/body.js', './js/analysis/plan.js', './js/data/schema.js',
  './js/analysis/stats.js', './js/analysis/norms.js', './js/analysis/sleep.js', './js/analysis/training.js',
  './js/analysis/readiness.js', './js/analysis/discover.js', './js/analysis/engine.js',
  './js/ui/charts.js', './js/ui/icons.js', './js/ui/onboarding.js', './js/ui/markdown.js', './js/coach/tools.js', './js/coach/prompt.js', './js/coach/local.js', './icons/icon-192.png', './icons/apple-touch-icon.png', './fonts/InterVariable.woff2',
];
// cache: 'reload' makes the new version cache fresh files, never ones the browser's HTTP
// cache is still holding (GitHub Pages lets browsers reuse files for 10 minutes).
self.addEventListener('install', (e) => e.waitUntil(
  caches.open(CACHE).then((c) => c.addAll(SHELL.map((u) => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()),
));
self.addEventListener('activate', (e) => e.waitUntil(
  caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
));
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (url.origin !== location.origin || url.pathname.includes('/api/')) return;
  // Network first so updates land immediately; cache is the offline fallback.
  if (e.request.method !== 'GET') return;
  // Always revalidate with the server (a cheap 304 when nothing changed), so an update
  // shows up on the next open instead of up to 10 minutes later.
  e.respondWith(fetch(e.request.url, { cache: 'no-cache', credentials: 'same-origin' }).then((res) => {
    const copy = res.clone();
    caches.open(CACHE).then((c) => c.put(e.request, copy));
    return res;
  }).catch(() => caches.match(e.request)));
});
