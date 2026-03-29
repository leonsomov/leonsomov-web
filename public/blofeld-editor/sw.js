const CACHE_NAME = 'blofeld-editor-v1';
const ASSETS = [
  '/blofeld-editor/',
  '/blofeld-editor/index.html',
  '/blofeld-editor/css/styles.css',
  '/blofeld-editor/js/blofeld-params.js',
  '/blofeld-editor/js/editor.js',
  '/blofeld-editor/js/generator.js',
  '/blofeld-editor/js/librarian.js',
  '/blofeld-editor/js/midi.js',
  '/blofeld-editor/js/names.js',
  '/blofeld-editor/js/sysex.js',
  '/blofeld-editor/js/ui-components.js',
  '/blofeld-editor/js/wavetable.js',
  '/blofeld-editor/manifest.json',
  '/blofeld-editor/presets.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
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
  event.respondWith(
    caches.match(event.request).then((cached) => {
      // Network first, fall back to cache
      return fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => cached || new Response('Offline', { status: 503 }));
    })
  );
});
