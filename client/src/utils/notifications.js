// GhartakKart Mobile Order Notification & Alert Tone Manager
import { playChime, unlockAudioContext } from './sound.js';

export function isNotificationSupported() {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function getNotificationPermission() {
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission;
}

export async function requestNotificationPermission() {
  if (!isNotificationSupported()) {
    return 'unsupported';
  }

  // Pre-unlock audio on this user gesture
  unlockAudioContext();

  // Register service worker if supported
  if ('serviceWorker' in navigator) {
    try {
      await navigator.serviceWorker.register('/sw.js');
    } catch (e) {
      console.warn('SW registration notice:', e);
    }
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      // Play confirmation alert tone so user verifies audio is unlocked
      playChime('new_order');
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([200, 100, 200]);
      }
    }
    return permission;
  } catch (err) {
    console.warn('Notification permission request error:', err);
    return Notification.permission;
  }
}

export async function sendOrderNotification(order, skipSound = false) {
  if (!order) return;

  // 1. Play the uploaded custom order alert tone & vibrate mobile device
  if (!skipSound) {
    try {
      playChime('new_order');
    } catch {}
  }

  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try {
      navigator.vibrate([500, 200, 500, 200, 500]);
    } catch {}
  }

  // 2. Fire native system notification if permitted
  if (!isNotificationSupported() || Notification.permission !== 'granted') {
    return;
  }

  const orderIdDisplay = order.id ? `#${String(order.id).slice(-6)}` : '';
  const orderAmount = order.total || order.subtotal || 0;
  const customerName = order.customer_name || order.customer?.name || 'Customer';
  const itemCount = Array.isArray(order.items) ? order.items.length : 1;

  const title = `🛍️ New Order ${orderIdDisplay} Received!`;
  const body = `₹${orderAmount} • ${customerName} • ${itemCount} item(s) • Tap to view`;

  const notificationOptions = {
    body,
    icon: '/logo.jpg',
    badge: '/logo.jpg',
    tag: `order-${order.id || Date.now()}`,
    renotify: true,
    requireInteraction: true,
    vibrate: [500, 250, 500, 250, 500],
    sound: '/order-alert.mp3',
    data: {
      url: '/admin.html',
      orderId: order.id
    }
  };

  // Try service worker notification first (with 1.2s timeout to avoid hanging)
  let showedViaSw = false;
  if ('serviceWorker' in navigator) {
    try {
      const reg = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise(r => setTimeout(() => r(null), 1200))
      ]);
      if (reg && reg.showNotification) {
        await reg.showNotification(title, notificationOptions);
        showedViaSw = true;
      }
    } catch (e) {
      console.warn('SW notification fallback to window Notification:', e);
    }
  }

  // Fallback to standard window Notification if SW took too long
  if (!showedViaSw && typeof Notification !== 'undefined') {
    try {
      const notif = new Notification(title, notificationOptions);
      notif.onclick = () => {
        window.focus();
        notif.close();
      };
    } catch (e) {
      console.warn('Window Notification fallback error:', e);
    }
  }
}

export async function testOrderNotification() {
  unlockAudioContext();

  let perm = getNotificationPermission();
  if (perm !== 'granted' && isNotificationSupported()) {
    perm = await requestNotificationPermission();
  }

  // Always play the custom tone on test button
  playChime('new_order');

  const testOrder = {
    id: 'DEMO-' + Math.floor(1000 + Math.random() * 9000),
    total: 349,
    customer_name: 'Rahul Sharma (Test Order)',
    items: [{ id: '1', name: 'Fresh Vegetables' }, { id: '2', name: 'Dairy & Grocery' }]
  };

  await sendOrderNotification(testOrder, true);
}
