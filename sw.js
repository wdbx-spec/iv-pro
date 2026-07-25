const CACHE_NAME = 'promptai-cache-v2';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/css/style.css',
  '/css/variables.css',
  '/css/animations.css',
  '/js/app.js',
  '/js/api.js',
  '/js/ui.js',
  '/js/upload.js',
  '/js/prompt.js',
  '/js/quota.js',
  '/js/storage.js',
  '/js/utils.js',
  '/js/video.js',
  '/js/image.js',
  '/js/i18n.js',
  '/lang/en.json',
  '/lang/ar.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

self.addEventListener('fetch', (event) => {
  // We only cache GET requests
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Return cached response if found, else fetch from network
      return cachedResponse || fetch(event.request).then((networkResponse) => {
        // Cache the new network response for future use
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        return networkResponse;
      });
    }).catch(() => {
      // Fallback for offline if not in cache (e.g., return cached index.html)
      if (event.request.mode === 'navigate') {
        return caches.match('/index.html');
      }
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
