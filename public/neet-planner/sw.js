const CACHE = 'neet-planner-v1';
const URLS = [
  'index.html',
  'manifest.json',
  'icons/icon-192.svg',
  'icons/icon-512.svg',
  'https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.30.0/dist/tabler-icons.min.css',
  'https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.30.0/dist/fonts/tabler-icons.woff2'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(URLS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(clients.claim());
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request).catch(() => caches.match('index.html')))
  );
});
