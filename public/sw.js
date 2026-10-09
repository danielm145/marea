/* MAREA ALTA · Service Worker
   Regla de oro: la APP SIEMPRE viene de la red primero, así una versión nueva
   llega a todos los celulares apenas se despliega. El caché solo entra sin red.
   Supabase NUNCA se cachea (datos vivos y URLs firmadas).
   ⚠️ Subir CACHE cada vez que se toque este archivo. */
const CACHE = 'marea-v58';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(clients.claim()));

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.hostname.endsWith('supabase.co') || url.hostname === '127.0.0.1' || url.hostname === 'localhost') return;
  // las imágenes hechas con IA no cambian nunca: se guardan en el teléfono y salen al instante (también sin señal)
  if (url.pathname.startsWith('/api/arte/')) {
    e.respondWith(caches.open('marea-arte').then(async (c) => {
      const hit = await c.match(req); if (hit) return hit;
      const r = await fetch(req); if (r && r.ok && (r.headers.get('content-type') || '').startsWith('image/')) c.put(req, r.clone());
      return r;
    }));
    return;
  }
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

/* ── AVISOS: el mensaje llega cifrado (RFC 8291) y aquí se muestra ── */
self.addEventListener('push', (e) => {
  e.waitUntil((async () => {
    let d = {};
    try { d = e.data ? e.data.json() : {}; } catch { try { d = { cuerpo: e.data.text() }; } catch { d = {}; } }
    await self.registration.showNotification(d.titulo || 'Casablanca', {
      body: d.cuerpo || 'Hay algo nuevo del viaje.', icon: '/icon-192.png', badge: '/icon-192.png',
      tag: d.url || 'casablanca', renotify: true, data: { url: d.url || '/' },
    });
  })());
});
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const destino = (e.notification.data && e.notification.data.url) || '/';
  e.waitUntil((async () => {
    const abiertas = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of abiertas) { if (c.url.startsWith(self.location.origin)) { await c.focus(); return c.navigate(destino); } }
    return self.clients.openWindow(destino);
  })());
});
