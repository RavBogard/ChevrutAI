// EMERGENCY RESET SERVICE WORKER
// This version deletes all caches and forces network-only requests
// to fix the stale index.html issue.

self.addEventListener('install', (event) => {
    console.log('Installing Emergency Reset SW');
    self.skipWaiting(); // Activate immediately
});

self.addEventListener('activate', (event) => {
    console.log('Activating Emergency Reset SW - Clearing Caches');
    event.waitUntil(
        Promise.all([
            self.clients.claim(),
            caches.keys().then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        console.log('Deleting cache:', cacheName);
                        return caches.delete(cacheName);
                    })
                );
            })
        ])
    );
});

// Network-only strategy
self.addEventListener('fetch', (event) => {
    event.respondWith(fetch(event.request));
});
