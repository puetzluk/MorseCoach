/* Einfacher Offline-Cache: die Seite funktioniert nach dem ersten Laden auch ohne Netz. */
const CACHE = 'morse-v16';
// Grundgerüst der App; die Bilder der Meer-Animation (startszene/) landen beim ersten Laden automatisch im Cache.
// (Die Icons fehlen im Repo noch – sobald der Ordner icons/ da ist, hier wieder eintragen.)
const FILES = ['./', 'index.html', 'css/style.css', 'css/intro.css', 'js/morse.js', 'js/storage.js', 'js/game.js',
  'js/app.js', 'js/intro.js', 'js/hell-fx.js', 'startszene/index.html', 'manifest.webmanifest'];

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
