import React from 'react';
import ReactDOM from 'react-dom/client';
import { StoreProvider } from './context/StoreContext.jsx';
import DeliveryApp from './delivery/DeliveryApp.jsx';
import './index.css';

// Register Service Worker for Mobile Notifications & Background Alerts
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((reg) => {
        console.log('GK Delivery Partner Service Worker registered:', reg.scope);
      })
      .catch((err) => {
        console.warn('GK Delivery Service Worker error:', err);
      });
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <StoreProvider>
      <DeliveryApp />
    </StoreProvider>
  </React.StrictMode>
);
