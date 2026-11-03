import React from 'react';
import ReactDOM from 'react-dom/client';
import { StoreProvider } from './context/StoreContext.jsx';
import AdminApp from './AdminApp.jsx';
import './index.css';

// Register Service Worker for Mobile Notifications
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((reg) => {
        console.log('GK Admin Service Worker registered successfully:', reg.scope);
      })
      .catch((err) => {
        console.warn('GK Admin Service Worker registration error:', err);
      });
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <StoreProvider>
      <AdminApp />
    </StoreProvider>
  </React.StrictMode>
);
