// Service worker: lets the installed app open offline.
// - App files: network first, so you always get the newest version when online (and it's saved
//   for later); offline, the saved copy is used.
// - The DM Sans font (Google Fonts): the saved copy first, refreshed in the background.
// When adding a file to the app, add it to APP_FILES so it's available offline from the first visit.

const CACHE = 'tippy-v1';
const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];

const APP_FILES = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/tokens.css',
  'css/styles.css',
  'css/win95.css',
  'css/screens.css',
  'assets/images/icon.svg',
  'assets/images/icon-192.png',
  'assets/images/icon-512.png',
  'assets/images/icon-maskable-512.png',
  'assets/images/apple-touch-icon.png',
  'js/actions.js',
  'js/app.js',
  'js/data.js',
  'js/dates.js',
  'js/esc.js',
  'js/grid-overlay.js',
  'js/money.js',
  'js/split.js',
  'js/staff-actions.js',
  'js/store.js',
  'js/ui-state.js',
  'js/ui.js',
  'js/pdf/payout-layout.js',
  'js/pdf/payout-pdf.js',
  'js/pdf/pdf-writer.js',
  'js/pdf/share.js',
  'js/views/log-dialog.js',
  'js/views/payout.js',
  'js/views/staff.js',
  'js/views/today.js',
  'js/views/week.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(APP_FILES))
      .then(() => self.skipWaiting()),
  );
});

// Remove caches from older versions of this service worker.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(names.filter((name) => name !== CACHE).map((name) => caches.delete(name))))
      .then(() => self.clients.claim()),
  );
});

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const copy = response.clone();
      caches.open(CACHE).then((cache) => cache.put(request, copy));
    }
    return response;
  } catch {
    const cached = await caches.match(request, { ignoreSearch: true });
    if (cached) return cached;
    // Offline page loads (any #/tab) fall back to the app's page.
    if (request.mode === 'navigate') return caches.match('index.html');
    return Response.error();
  }
}

async function fontCacheFirst(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request);
  const fresh = fetch(request).then((response) => {
    if (response.ok || response.type === 'opaque') cache.put(request, response.clone());
    return response;
  });
  if (cached) {
    fresh.catch(() => {});
    return cached;
  }
  return fresh;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (FONT_HOSTS.includes(url.hostname)) {
    event.respondWith(fontCacheFirst(request));
    return;
  }
  if (url.origin !== self.location.origin) return;
  event.respondWith(networkFirst(request));
});
