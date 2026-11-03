// GhartakKart Admin Service Worker for Push Notifications & Background Alerts
const CACHE_NAME = 'gk-admin-v2';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((keys) => {
        return Promise.all(
          keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
        );
      })
    ])
  );
});

// Handle incoming notification click - focus or open admin page
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = (event.notification.data && event.notification.data.url) || '/admin.html';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes('admin') && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});

// Handle messages from window to show notifications
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_ORDER_NOTIFICATION') {
    const { title, options } = event.data;
    self.registration.showNotification(title, options);
  }
});

// Handle Push API events if Web Push is triggered
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : 'New order received!' };
  }

  const title = data.title || '🛍️ New Order Received!';
  const options = {
    body: data.body || 'A new customer order has been placed.',
    icon: '/logo.jpg',
    badge: '/logo.jpg',
    image: '/logo.jpg',
    sound: '/order-alert.mp3',
    tag: data.tag || 'order-' + Date.now(),
    renotify: true,
    requireInteraction: true,
    vibrate: [500, 250, 500, 250, 500],
    data: {
      url: data.url || '/admin.html'
    }
  };

  event.waitUntil(self.registration.showNotification(title, options));
});
