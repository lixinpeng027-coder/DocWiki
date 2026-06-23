// DocWiki Service Worker — 离线缓存
const CACHE = 'docwiki-v1';
const PRELOAD = ['/', '/index.html', '/css/style.css', '/js/app.js', '/js/chat.js', '/js/settings.js', '/manifest.json', '/assets/images/logo.png'];

self.addEventListener('install', e => {
    e.waitUntil(caches.open(CACHE).then(c => c.addAll(PRELOAD)).catch(() => {}));
    self.skipWaiting();
});

self.addEventListener('activate', e => {
    e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))));
});

self.addEventListener('fetch', e => {
    if (e.request.method !== 'GET') return;
    e.respondWith(
        caches.match(e.request).then(cached => cached || fetch(e.request).then(res => {
            if (res.ok && res.type === 'basic') {
                const clone = res.clone();
                caches.open(CACHE).then(c => c.put(e.request, clone));
            }
            return res;
        }).catch(() => cached || new Response('Offline', { status: 503 })))
    );
});
