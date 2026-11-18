/* Офлайн-кэш (только по http/https; при file:// не регистрируется) */
const V = 'petelka-m0-3';
const FILES = ['./', 'index.html', 'manifest.webmanifest', 'data/levels.js', 'data/demo.js', 'data/catalog.js', 'src/util.js', 'src/palette.js', 'src/stitch.js', 'src/items.js', 'src/scene.js', 'src/audio.js', 'src/logic.js', 'src/game.js',
  'assets/img/bg_pastel.webp', 'assets/audio/piano.mp3', 'assets/fonts/MarckScript-cyr.woff2', 'assets/fonts/MarckScript-lat.woff2', 'assets/fonts/Nunito-cyr.woff2', 'assets/fonts/Nunito-lat.woff2', 'icons/icon-180.png', 'icons/icon-192.png', 'icons/icon-512.png'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(V).then((c) => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== V).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => { e.respondWith(caches.match(e.request).then((r) => r || fetch(e.request))); });
