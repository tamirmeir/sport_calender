const CACHE_NAME = 'sport-calendar-v5-mobile';
const DYNAMIC_CACHE = 'sc-dynamic-v5';
const IMAGE_CACHE = 'sc-images-v1';

const ASSETS = [
    '/',
    '/index.html',
    // Modern Design System
    '/css_v2/modern-design-system.css',
    '/css_v2/mobile-nav.css',
    '/css_v2/legacy-adapter.css',
    '/css_v2/styles.css',
    '/css/auth.css',
    // JavaScript
    '/js/theme-manager.js',
    '/js/mobile-enhancements.js',
    '/js/mobile-nav.js',
    '/js/app_v2.js',
    // Assets
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
                keys.map(key => {
                    if (key !== CACHE_NAME && key !== DYNAMIC_CACHE && key !== IMAGE_CACHE) {
                        return caches.delete(key);
                    }
                })
            ))
        ])
    );
});

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // 1. Stale-While-Revalidate for League List
    if (url.pathname.includes('/api/fixtures/leagues')) {
        event.respondWith(
            caches.open(DYNAMIC_CACHE).then(cache => {
                return cache.match(event.request).then(cachedResponse => {
                    const fetchPromise = fetch(event.request).then(networkResponse => {
                        if (networkResponse.ok) {
                            cache.put(event.request, networkResponse.clone());
                        }
                        return networkResponse;
                    }).catch(err => {
                        console.log('Network failed, serving fallback', err);
                        // Fallback JSON if offline and no cache
                        const fallbackData = [{
                            id: 9999,
                            name: "No Connection",
                            type: "Offline",
                            logo: "/favicon.svg",
                            status: "vacation",
                            ui_label: "📡 Offline"
                        }];
                        return new Response(JSON.stringify(fallbackData), {
                            headers: { 'Content-Type': 'application/json' }
                        });
                    });
                    
                    return cachedResponse || fetchPromise;
                });
            })
        );
        return;
    }

    // 2. Cache First for API-Sports Images (Logos)
    if (url.hostname === 'media.api-sports.io') {
         event.respondWith(
            caches.open(IMAGE_CACHE).then(cache => {
                return cache.match(event.request).then(cachedResponse => {
                    if (cachedResponse) return cachedResponse;
                    return fetch(event.request).then(networkResponse => {
                        cache.put(event.request, networkResponse.clone());
                        return networkResponse;
                    });
                });
            })
        );
        return;
    }

    // 3. Skip other API requests (Network Only)
    // We don't want to show stale scores or auth tokens
    if (url.pathname.includes('/api/') || url.pathname.includes('/sync/')) {
        return;
    }
    
    // 4. Cache First for Assets (App Shell)
    if (event.request.url.startsWith(self.location.origin)) {
        event.respondWith(
            caches.match(event.request).then((cachedResponse) => {
                return cachedResponse || fetch(event.request);
            })
        );
    }
});