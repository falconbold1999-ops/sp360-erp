// SP360 ERP v2.2 — Service Worker
// Provides offline support and caching for better mobile experience

const CACHE_NAME = 'sp360-erp-v2.2';
const STATIC_ASSETS = [
  '/sp360-erp/',
  '/sp360-erp/index.html',
  '/sp360-erp/manifest.json'
];

// Install — cache static assets
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_ASSETS).catch(() => {
        // Ignore cache errors (e.g. external CDN scripts)
      });
    })
  );
  self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys
        .filter(k => k !== CACHE_NAME)
        .map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Fetch — Network first, cache fallback for HTML
// Always network for Supabase API calls
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Always fetch from network: Supabase API, auth, functions
  if (url.hostname.includes('supabase.co') ||
      url.hostname.includes('anthropic.com') ||
      url.pathname.includes('/functions/')) {
    return; // Let browser handle normally
  }

  // For HTML: network first, cache fallback
  if (e.request.mode === 'navigate' ||
      e.request.headers.get('accept')?.includes('text/html')) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // For other assets: cache first
  e.respondWith(
    caches.match(e.request).then(cached => {
      return cached || fetch(e.request);
    })
  );
});
