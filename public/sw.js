const CACHE_NAME = 'matchday-v3-national';
const ASSETS = [
    '/',
    '/index.html',
    '/css_v2/styles.css',
    '/css/auth.css',
    '/js/app_v2.js',
    '/favicon.svg',
    '/manifest.json'
];

self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        Promise.all([
            self.clients.claim(),
            caches.keys().then((keys) => Promise.all(
                keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
            ))
        ])
    );
});

self.addEventListener('fetch', (event) => {
    // SKIP API REQUESTS
    if (event.request.url.includes('/api/') || event.request.url.includes('/sync/')) {
        return;
    }
    
    // Cache First for Assets
    if (event.request.url.startsWith(self.location.origin)) {
        event.respondWith(
            caches.match(event.request).then((cachedResponse) => {
                return cachedResponse || fetch(event.request);
            })
        );
    }
});