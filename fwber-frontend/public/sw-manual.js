// fwber.site Service Worker - PWA Offline Support
const CACHE_NAME = 'fwber-v1.0.0';
const API_CACHE_NAME = 'fwber-api-v1.0.0';
const STATIC_CACHE_NAME = 'fwber-static-v1.0.0';

// Cache strategies
const CACHE_STRATEGIES = {
  // Static assets - cache first
  static: ['/static/', '/_next/static/', '/images/', '/icons/'],
  // API calls - network first, cache fallback
  api: ['/api/'],
  // Pages - network first, cache fallback
  pages: ['/bulletin-boards', '/dashboard', '/profile'],
  // Real-time - network only
  realtime: ['/mercure', '/stream']
};

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  
  event.waitUntil(
    Promise.all([
      // Cache static assets
      caches.open(STATIC_CACHE_NAME).then((cache) => {
        return cache.addAll([
          '/',
          '/bulletin-boards',
          '/dashboard',
          '/profile',
          '/offline.html',
          '/manifest.json',
          '/icons/icon-192x192.png',
          '/icons/icon-512x512.png'
        ]);
      }),
      // Cache API responses
      caches.open(API_CACHE_NAME).then((cache) => {
        return cache.addAll([
          '/api/bulletin-boards',
          '/api/location',
          '/api/auth/status'
        ]);
      })
    ]).then(() => {
      console.log('Service Worker installed successfully');
      return self.skipWaiting();
    })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && 
                cacheName !== API_CACHE_NAME && 
                cacheName !== STATIC_CACHE_NAME) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Take control of all clients
      self.clients.claim()
    ]).then(() => {
      console.log('Service Worker activated successfully');
    })
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip real-time connections
  if (isRealtimeRequest(url)) {
    return;
  }
  
  // Apply appropriate caching strategy
  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE_NAME));
  } else if (isApiRequest(url)) {
    event.respondWith(networkFirst(request, API_CACHE_NAME));
  } else if (isPageRequest(url)) {
    event.respondWith(networkFirst(request, CACHE_NAME));
  } else {
    event.respondWith(networkOnly(request));
  }
});

// Background sync for offline messages
self.addEventListener('sync', (event) => {
  console.log('Background sync triggered:', event.tag);
  
  if (event.tag === 'bulletin-message') {
    event.waitUntil(syncOfflineMessages());
  } else if (event.tag === 'location-update') {
    event.waitUntil(syncLocationUpdates());
  }
});

// Push notifications
self.addEventListener('push', (event) => {
  console.log('Push notification received:', event);
  
  let data = { title: 'fwber.site', body: 'New notification', url: '/' };
  
  try {
    data = event.data ? event.data.json() : data;
  } catch (e) {
    data.body = event.data ? event.data.text() : data.body;
  }

  const options = {
    body: data.body,
    icon: data.icon || '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [200, 100, 200],
    data: {
      url: data.url || '/',
      timestamp: Date.now()
    },
    actions: data.actions || [
      {
        action: 'view',
        title: 'View',
        icon: '/icons/view-24x24.png'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title || 'fwber.site', options)
  );
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);
  
  event.notification.close();
  
  if (event.action === 'view' || !event.action) {
    event.waitUntil(
      clients.openWindow(event.notification.data.url)
    );
  }
});

// Cache strategies
async function cacheFirst(request, cacheName) {
  try {
    const cache = await caches.open(cacheName);
    const cached = await cache.match(request);
    
    if (cached) {
      return cached;
    }
    
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    console.error('Cache first strategy failed:', error);
    return new Response('Offline', { status: 503 });
  }
}

async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    console.log('Network failed, trying cache:', error);
    
    const cache = await caches.open(cacheName);
    const cached = await cache.match(request);
    
    if (cached) {
      return cached;
    }
    
    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      return caches.match('/offline.html');
    }
    
    return new Response('Offline', { status: 503 });
  }
}

async function networkOnly(request) {
  try {
    return await fetch(request);
  } catch (error) {
    console.error('Network only strategy failed:', error);
    return new Response('Offline', { status: 503 });
  }
}

// Helper functions
function isStaticAsset(url) {
  return CACHE_STRATEGIES.static.some(pattern => url.pathname.includes(pattern));
}

function isApiRequest(url) {
  return CACHE_STRATEGIES.api.some(pattern => url.pathname.includes(pattern));
}

function isPageRequest(url) {
  return CACHE_STRATEGIES.pages.some(pattern => url.pathname.includes(pattern));
}

function isRealtimeRequest(url) {
  return CACHE_STRATEGIES.realtime.some(pattern => url.pathname.includes(pattern));
}

// Background sync functions
async function syncOfflineMessages() {
  try {
    const offlineMessages = await getOfflineMessages();
    
    for (const message of offlineMessages) {
      const response = await fetch('/api/bulletin-boards/' + message.boardId + '/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + message.token
        },
        body: JSON.stringify({
          content: message.content,
          lat: message.lat,
          lng: message.lng,
          is_anonymous: message.is_anonymous
        })
      });
      
      if (response.ok) {
        await removeOfflineMessage(message.id);
        console.log('Offline message synced:', message.id);
      }
    }
  } catch (error) {
    console.error('Failed to sync offline messages:', error);
  }
}

async function syncLocationUpdates() {
  try {
    const offlineLocations = await getOfflineLocations();
    
    for (const location of offlineLocations) {
      const response = await fetch('/api/location', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + location.token
        },
        body: JSON.stringify({
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: location.accuracy
        })
      });
      
      if (response.ok) {
        await removeOfflineLocation(location.id);
        console.log('Offline location synced:', location.id);
      }
    }
  } catch (error) {
    console.error('Failed to sync offline locations:', error);
  }
}

// IndexedDB helpers for offline storage
async function getOfflineMessages() {
  // This would typically use IndexedDB
  return [];
}

async function removeOfflineMessage(id) {
  // This would typically use IndexedDB
  console.log('Removing offline message:', id);
}

async function getOfflineLocations() {
  // This would typically use IndexedDB
  return [];
}

async function removeOfflineLocation(id) {
  // This would typically use IndexedDB
  console.log('Removing offline location:', id);
}