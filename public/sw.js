// TheoShift Service Worker
// Version 2.0.4 — chat alerts use the event name as the notification title

const STATIC_CACHE = 'theoshift-static-v2.0.4';
const DATA_CACHE = 'theoshift-data-v2.0.4';
const OFFLINE_URL = '/offline.html';

// Static assets to precache on install
const STATIC_ASSETS = [
  '/offline.html',
  '/favicon.svg',
  '/logo.svg',
  '/logo.png',
  '/logo-192.png',
  '/logo-512.png',
  '/manifest.json'
];

// Volunteer pages to cache for offline navigation
const VOLUNTEER_PAGES = [
  '/volunteer/dashboard',
  '/volunteer/select-event',
  '/volunteer/early-checkin'
];

// API routes to cache with stale-while-revalidate strategy
// These are the routes that power the volunteer dashboard offline experience
const VOLUNTEER_API_PREFIXES = [
  '/api/volunteer/dashboard',
  '/api/volunteer/events',
  '/api/volunteer/early-checkin',
  '/api/global-announcements'
];

function isVolunteerApiRoute(url) {
  const path = new URL(url).pathname;
  return VOLUNTEER_API_PREFIXES.some(prefix => path.startsWith(prefix));
}

function isVolunteerPage(url) {
  const path = new URL(url).pathname;
  return VOLUNTEER_PAGES.some(page => path.startsWith(page));
}

// Install event - precache static assets and volunteer pages
self.addEventListener('install', (event) => {
  console.log('[SW] Installing v2.0.3...');
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        return Promise.allSettled(
          [...STATIC_ASSETS, ...VOLUNTEER_PAGES].map(url =>
            cache.add(url).catch(err => {
              console.warn('[SW] Failed to precache:', url, err);
            })
          )
        );
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating v2.0.3...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== STATIC_CACHE && name !== DATA_CACHE)
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - strategy depends on request type
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  if (!event.request.url.startsWith('http')) return;

  const url = event.request.url;

  // Full document navigations must bypass the SW. Cache-first HTML broke mobile
  // magic-link login (stale shells / ERR_FAILED after session cookie was set).
  if (event.request.mode === 'navigate') {
    return;
  }
  
  // Exclude auth routes from service worker (allow redirects for magic links)
  if (url.includes('/api/auth/') || url.includes('/auth/')) {
    return; // Let browser handle auth routes natively
  }

  const pathname = new URL(url).pathname

  // Next.js bundles: never wrap — flaky fetch + Strategy 3 produced bogus 503 "Offline" for chunks.
  if (pathname.startsWith('/_next/')) {
    return
  }

  // Staff / admin / general APIs (everything except volunteer offline list): bypass SW entirely.
  // Otherwise Strategy 3 returns synthetic Response(status 503) when fetch() rejects, which
  // breaks pages like /events/[id]/volunteers that call /api/events/.../volunteers.
  if (pathname.startsWith('/api/') && !isVolunteerApiRoute(url)) {
    return
  }

  // Strategy 1: Stale-while-revalidate for volunteer API routes
  // Serve cached data immediately, update cache in background
  if (isVolunteerApiRoute(url)) {
    event.respondWith(
      caches.open(DATA_CACHE).then((cache) => {
        return cache.match(event.request).then((cachedResponse) => {
          const networkFetch = fetch(event.request)
            .then((networkResponse) => {
              if (networkResponse.status === 200) {
                cache.put(event.request, networkResponse.clone());
              }
              return networkResponse;
            })
            .catch(() => {
              // Network failed — cached response already being returned
              return null;
            });

          // Return cached immediately if available, otherwise wait for network
          return cachedResponse || networkFetch;
        });
      })
    );
    return;
  }

  // Strategy 2: Cache-first for volunteer pages (offline navigation)
  if (isVolunteerPage(url)) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          // Update cache in background
          fetch(event.request)
            .then((networkResponse) => {
              if (networkResponse.status === 200) {
                caches.open(STATIC_CACHE).then((cache) => {
                  cache.put(event.request, networkResponse);
                });
              }
            })
            .catch(() => {});
          return cachedResponse;
        }
        // Not cached yet — fetch from network
        return fetch(event.request).catch(() => caches.match(OFFLINE_URL));
      })
    );
    return;
  }

  // Strategy 3: Network-first for everything else, fallback to cache
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.status === 200) {
          const responseToCache = response.clone();
          caches.open(STATIC_CACHE).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          if (event.request.mode === 'navigate') {
            return caches.match(OFFLINE_URL);
          }
          return new Response('Offline', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({ 'Content-Type': 'text/plain' })
          });
        });
      })
  );
});

// Background sync - retry failed check-ins when back online
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);
  if (event.tag === 'volunteer-checkin-retry') {
    event.waitUntil(retryPendingCheckins());
  }
});

async function retryPendingCheckins() {
  try {
    const db = await openPendingDB();
    const pending = await db.getAll('pending-checkins');
    for (const item of pending) {
      try {
        const response = await fetch('/api/volunteer/early-checkin/check-in', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item.payload)
        });
        if (response.ok) {
          await db.delete('pending-checkins', item.id);
          console.log('[SW] Retried check-in successfully:', item.id);
        }
      } catch {
        console.warn('[SW] Retry failed for check-in:', item.id);
      }
    }
  } catch {
    // IndexedDB not available or no pending items
  }
}

function openPendingDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('theoshift-pending', 1);
    request.onupgradeneeded = (e) => {
      e.target.result.createObjectStore('pending-checkins', { keyPath: 'id' });
    };
    request.onsuccess = (e) => resolve({
      getAll: (store) => new Promise((res, rej) => {
        const tx = e.target.result.transaction(store, 'readonly');
        const req = tx.objectStore(store).getAll();
        req.onsuccess = () => res(req.result);
        req.onerror = () => rej(req.error);
      }),
      delete: (store, id) => new Promise((res, rej) => {
        const tx = e.target.result.transaction(store, 'readwrite');
        const req = tx.objectStore(store).delete(id);
        req.onsuccess = () => res();
        req.onerror = () => rej(req.error);
      })
    });
    request.onerror = () => reject(request.error);
  });
}

// Push notifications (future enhancement)
self.addEventListener('push', (event) => {
  try {
    const data = event.data ? event.data.json() : {};
    const eventName = typeof data?.eventName === 'string' ? data.eventName.trim() : ''
    const channelName = typeof data?.channelName === 'string' ? data.channelName.trim() : ''
    const preview = data?.bodyPreview || 'New message'
    const title = eventName || (channelName ? `TheoShift: ${channelName}` : 'TheoShift')
    const body = eventName && channelName ? `${channelName}: ${preview}` : preview
    const url = data?.url || '/'

    event.waitUntil(
      self.registration.showNotification(title, {
        body,
        data: { url },
        icon: '/logo-192.png',
        badge: '/logo-192.png'
      })
    );
  } catch (err) {
    console.warn('[SW] Push parse failed', err);
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification?.data?.url || '/';

  event.waitUntil((async () => {
    const allClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of allClients) {
      try {
        if ('focus' in client) {
          client.focus();
          if ('navigate' in client) {
            await client.navigate(url);
          }
          return;
        }
      } catch {}
    }
    await self.clients.openWindow(url);
  })());
});
