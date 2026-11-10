/* Einfacher Offline-Cache: die Seite funktioniert nach dem ersten Laden auch ohne Netz. */
const CACHE = 'morse-v7';
const FILES = ['./', 'index.html', 'css/style.css', 'css/scene.css', 'js/morse.js', 'js/storage.js', 'js/game.js',
  'js/scene-art.js', 'js/scene.js', 'js/app.js',
  'manifest.webmanifest', 'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-180.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
// Netz zuerst (damit Updates ankommen), Cache als Rückfall
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(fetch(e.request).then(r => {
    const copy = r.clone();
    caches.open(CACHE).then(c => c.put(e.request, copy));
    return r;
  }).catch(() => caches.match(e.request)));
});
