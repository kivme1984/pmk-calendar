const CACHE = 'pmk-calendar-v31';
const ASSETS = [
  './',
  './index.html',
  './reset.html',
  './styles.css?v=30',
  './manager-planner.css',
  './app.js?v=30',
  './manager-planner-core.js',
  './manager-planner-hooks.js',
  './manifest.webmanifest',
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
    await Promise.all(clients.map(client => client.navigate(client.url)));
  })());
});

async function networkText(url) {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Не удалось загрузить ${url}`);
  return response.text();
}

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || !event.request.url.startsWith(self.location.origin)) return;
  const requestUrl = new URL(event.request.url);

  if (requestUrl.pathname.endsWith('/app.js')) {
    event.respondWith((async () => {
      try {
        const [app, core, hooks] = await Promise.all([
          networkText('./app.js?v=30'),
          networkText('./manager-planner-core.js'),
          networkText('./manager-planner-hooks.js'),
        ]);
        return new Response(`${app}\n\n${core}\n\n${hooks}`, {
          headers: { 'Content-Type': 'application/javascript; charset=utf-8', 'Cache-Control': 'no-store' },
        });
      } catch {
        return caches.match(event.request);
      }
    })());
    return;
  }

  if (requestUrl.pathname.endsWith('/styles.css')) {
    event.respondWith((async () => {
      try {
        const [base, manager] = await Promise.all([
          networkText('./styles.css?v=30'),
          networkText('./manager-planner.css'),
        ]);
        return new Response(`${base}\n\n${manager}`, {
          headers: { 'Content-Type': 'text/css; charset=utf-8', 'Cache-Control': 'no-store' },
        });
      } catch {
        return caches.match(event.request);
      }
    })());
    return;
  }

  const networkFirst = event.request.mode === 'navigate' || /\.(?:html)$/.test(requestUrl.pathname);
  if (networkFirst) {
    event.respondWith(fetch(event.request).then(response => {
      const clone = response.clone();
      caches.open(CACHE).then(cache => cache.put(event.request, clone));
      return response;
    }).catch(() => caches.match(event.request)));
    return;
  }

  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
    const clone = response.clone();
    caches.open(CACHE).then(cache => cache.put(event.request, clone));
    return response;
  })));
});
