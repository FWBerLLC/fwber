// fwber.site Service Worker - Push Notifications & Background Sync
// Extracted from sw-manual.js to avoid conflicts with next-pwa caching

// Background sync for offline messages
self.addEventListener('sync', (event) => {
  console.log('Background sync triggered:', event.tag);
  
  if (event.tag === 'bulletin-message') {
    event.waitUntil(syncOfflineMessages());
  } else if (event.tag === 'location-update') {
    event.waitUntil(syncLocationUpdates());
  } else if (event.tag === 'chat-message') {
    event.waitUntil(syncOfflineChatMessages());
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
    icon: data.icon || '/icon.svg',
    badge: '/icon.svg',
    vibrate: [200, 100, 200],
    data: {
      url: data.url || '/',
      timestamp: Date.now()
    },
    actions: data.actions || [
      {
        action: 'view',
        title: 'View',
        icon: '/icon.svg'
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
    const urlToOpen = new URL(event.notification.data.url, self.location.origin).href;

    const promiseChain = clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then((windowClients) => {
      // Check if there is already a window/tab open with the target URL
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        // If so, just focus it.
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // If not, then open the target URL in a new window/tab.
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    });

    event.waitUntil(promiseChain);
  }
});

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

async function syncOfflineChatMessages() {
  try {
    const offlineMessages = await getOfflineChatMessages();
    
    for (const message of offlineMessages) {
      let response;
      
      if (message.message.type === 'audio' && message.message.media) {
        // Handle Audio/Media Message
        const formData = new FormData();
        formData.append('receiver_id', message.recipient_id);
        formData.append('media', message.message.media);
        formData.append('media_duration', message.message.media_duration);
        formData.append('message_type', 'audio');

        response = await fetch('/api/messages', {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer ' + message.token
          },
          body: formData
        });
      } else {
        // Handle Text Message
        response = await fetch('/api/websocket/message', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + message.token
          },
          body: JSON.stringify({
            recipient_id: message.recipient_id,
            message: message.message
          })
        });
      }
      
      if (response && response.ok) {
        await removeOfflineChatMessage(message.id);
        console.log('Offline chat message synced:', message.id);
      }
    }
  } catch (error) {
    console.error('Failed to sync offline chat messages:', error);
  }
}

// IndexedDB helpers for offline storage
const DB_NAME = 'fwber_offline_store';
const DB_VERSION = 2;
const STORE_MESSAGES = 'offline_messages';
const STORE_LOCATIONS = 'offline_locations';
const STORE_CHAT_MESSAGES = 'offline_chat_messages';

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_MESSAGES)) {
        db.createObjectStore(STORE_MESSAGES, { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains(STORE_LOCATIONS)) {
        db.createObjectStore(STORE_LOCATIONS, { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains(STORE_CHAT_MESSAGES)) {
        db.createObjectStore(STORE_CHAT_MESSAGES, { keyPath: 'id', autoIncrement: true });
      }
    };
  });
}

async function getOfflineMessages() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_MESSAGES, 'readonly');
    const store = transaction.objectStore(STORE_MESSAGES);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function removeOfflineMessage(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_MESSAGES, 'readwrite');
    const store = transaction.objectStore(STORE_MESSAGES);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function getOfflineLocations() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_LOCATIONS, 'readonly');
    const store = transaction.objectStore(STORE_LOCATIONS);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function removeOfflineLocation(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_LOCATIONS, 'readwrite');
    const store = transaction.objectStore(STORE_LOCATIONS);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function getOfflineChatMessages() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_CHAT_MESSAGES, 'readonly');
    const store = transaction.objectStore(STORE_CHAT_MESSAGES);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function removeOfflineChatMessage(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_CHAT_MESSAGES, 'readwrite');
    const store = transaction.objectStore(STORE_CHAT_MESSAGES);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}
