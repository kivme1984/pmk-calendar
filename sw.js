const CACHE = 'pmk-calendar-v47';
const ASSETS = [
  './',
  './index.html',
  './reset.html',
  './address-test.html',
  './worker-update.html',
  './styles.css?v=30',
  './manager-planner.css?v=32',
  './address-autocomplete.css?v=39',
  './mobile-rug-layout.css?v=36',
  './manager-form-v40.css',
  './unified-rug-services-v43.css?v=46',
  './app.js?v=38',
  './manager-planner-core.js',
  './manager-planner-hooks.js',
  './address-autocomplete.js?v=41',
  './address-mobile-v46.js',
  './stability-route.js?v=34',
  './stability-cache.js?v=34',
  './stability-copy.js?v=34',
  './stability-draft.js?v=34',
  './returning-client-search.js?v=35',
  './google-freeform-import.js?v=36',
  './runtime-stability-v37.js',
  './smart-paste-v38.js',
  './smart-paste-lifecycle-v38.js',
  './smart-parser-v45.js',
  './smart-parser-v45-runtime-fix.js',
  './smart-parser-v47.js',
  './auto-pricing-v40.js?v=44',
  './empty-rug-dimensions-v42.js',
  './unified-rug-services-v43.js?v=45',
  './complete-pricing-v45.js?v=47',
  './manifest.webmanifest',
  './version.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)));
    await self.clients.claim();

    const clients = await self.clients.matchAll({ type: 'window' });
    await Promise.all(clients
      .filter(client => /[?&]reset=/.test(client.url))
      .map(client => client.navigate(client.url)));
  })());
});

async function networkText(url) {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Не удалось загрузить ${url}`);
  return response.text();
}

async function cacheResponse(request, response) {
  const cache = await caches.open(CACHE);
  await cache.put(request, response.clone());
  return response;
}

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || !event.request.url.startsWith(self.location.origin)) return;
  const requestUrl = new URL(event.request.url);

  if (requestUrl.pathname.endsWith('/app.js')) {
    event.respondWith((async () => {
      try {
        const parts = await Promise.all([
          networkText('./app.js?v=38'),
          networkText('./manager-planner-core.js'),
          networkText('./manager-planner-hooks.js'),
          networkText('./address-autocomplete.js?v=41'),
          networkText('./address-mobile-v46.js'),
          networkText('./stability-route.js?v=34'),
          networkText('./stability-cache.js?v=34'),
          networkText('./stability-copy.js?v=34'),
          networkText('./stability-draft.js?v=34'),
          networkText('./returning-client-search.js?v=35'),
          networkText('./google-freeform-import.js?v=36'),
          networkText('./runtime-stability-v37.js'),
          networkText('./smart-paste-v38.js'),
          networkText('./smart-paste-lifecycle-v38.js'),
          networkText('./smart-parser-v45.js'),
          networkText('./smart-parser-v45-runtime-fix.js'),
          networkText('./smart-parser-v47.js'),
          networkText('./auto-pricing-v40.js?v=44'),
          networkText('./empty-rug-dimensions-v42.js'),
          networkText('./unified-rug-services-v43.js?v=45'),
          networkText('./complete-pricing-v45.js?v=47'),
        ]);
        const response = new Response(parts.join('\n\n'), {
          headers: {
            'Content-Type': 'application/javascript; charset=utf-8',
            'Cache-Control': 'no-store',
            'X-PMK-Version': '47',
          },
        });
        return cacheResponse(event.request, response);
      } catch {
        return caches.match(event.request);
      }
    })());
    return;
  }

  if (requestUrl.pathname.endsWith('/styles.css')) {
    event.respondWith((async () => {
      try {
        const parts = await Promise.all([
          networkText('./styles.css?v=30'),
          networkText('./manager-planner.css?v=32'),
          networkText('./address-autocomplete.css?v=39'),
          networkText('./mobile-rug-layout.css?v=36'),
          networkText('./manager-form-v40.css'),
          networkText('./unified-rug-services-v43.css?v=46'),
        ]);
        const response = new Response(parts.join('\n\n'), {
          headers: {
            'Content-Type': 'text/css; charset=utf-8',
            'Cache-Control': 'no-store',
            'X-PMK-Version': '47',
          },
        });
        return cacheResponse(event.request, response);
      } catch {
        return caches.match(event.request);
      }
    })());
    return;
  }

  const networkFirst = event.request.mode === 'navigate' || /\.(?:html|js|css|json|webmanifest)$/.test(requestUrl.pathname);
  if (networkFirst) {
    event.respondWith(fetch(event.request, { cache: 'no-store' })
      .then(response => cacheResponse(event.request, response))
      .catch(() => caches.match(event.request)));
    return;
  }

  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request).then(response => cacheResponse(event.request, response))));
});
