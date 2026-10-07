/* MAREA ALTA · Service Worker
   Regla de oro: la APP SIEMPRE viene de la red primero, así una versión nueva
   llega a todos los celulares apenas se despliega. El caché solo entra sin red.
   Supabase NUNCA se cachea (datos vivos y URLs firmadas).
   ⚠️ Subir CACHE cada vez que se toque este archivo. */
const CACHE = 'marea-v29';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(clients.claim()));

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.hostname.endsWith('supabase.co') || url.hostname === '127.0.0.1' || url.hostname === 'localhost') return;
  if (url.pathname.startsWith('/api/')) return;   // la IA siempre en vivo, nunca del caché

  const cacheFirst = url.hostname.includes('cdn') || url.hostname.includes('cloudflare')
    || url.hostname.includes('fonts.g') || url.hostname.includes('gstatic');
  if (cacheFirst) {
    e.respondWith(caches.open(CACHE).then(async (c) => {
      const hit = await c.match(req);
      const net = fetch(req).then((r) => { if (r && r.ok) c.put(req, r.clone()); return r; }).catch(() => hit);
      return hit || net;
    }));
    return;
  }
  e.respondWith(
    fetch(req).then((r) => {
      if (r && r.ok) { const cl = r.clone(); caches.open(CACHE).then((c) => c.put(req, cl)); }
      return r;
    }).catch(() => caches.match(req, { ignoreSearch: true }))
  );
});
