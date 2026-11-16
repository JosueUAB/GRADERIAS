/**
 * Service Worker para PWA - Graderías Tickets
 */
const CACHE_NAME = 'graderias-pwa-v1';

const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/manifest.json',
    '/demo/icono.svg',
    '/icons/icon-192x192.png',
    '/icons/icon-512x512.png',
    '/icons/favicon-32x32.png'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(STATIC_ASSETS).catch((err) => {
                console.warn('[PWA SW] Pre-caching parcial:', err);
            });
        }).then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((key) => {
                    if (key !== CACHE_NAME) {
                        return caches.delete(key);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const request = event.request;
    const url = new URL(request.url);

    // 1. Ignorar llamadas a APIs, websockets o métodos que no sean GET
    if (request.method !== 'GET' || url.pathname.startsWith('/api') || url.protocol.startsWith('ws')) {
        return;
    }

    // 2. Para navegación de páginas SPA (HTML), intentar red primero con fallback a caché
    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request).catch(() => {
                return caches.match('/index.html') || caches.match('/');
            })
        );
        return;
    }

    // 3. Para archivos estáticos (imágenes, fuentes, css, js): Stale-While-Revalidate
    event.respondWith(
        caches.match(request).then((cachedResponse) => {
            const fetchPromise = fetch(request).then((networkResponse) => {
                if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
                    const responseToCache = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(request, responseToCache);
                    });
                }
                return networkResponse;
            }).catch(() => {
                // Fallback silencioso en fallo de red
                return cachedResponse;
            });

            return cachedResponse || fetchPromise;
        })
    );
});
