import React from 'react';
import ReactDOM from 'react-dom/client';
import './theme.css';
import './index.css';
import App from './App';
import { BrowserRouter } from 'react-router-dom';
import { ToastProvider } from './contexts/ToastContext';
import reportWebVitals from './reportWebVitals';

/* Service worker registration.
 *
 * Production builds only. In development the served bundles are un-hashed and
 * change on every save, so caching them would hand back stale JavaScript and
 * break hot reload. Verifying locally therefore means serving a production
 * build (npm run build), not npm start.
 *
 * The worker itself is static and lives in public/, so CRA copies it to the site
 * root and it controls the whole origin. */
const registerServiceWorker = () => {
  if (process.env.NODE_ENV !== 'production') return;
  if (!('serviceWorker' in navigator)) return;

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(`${process.env.PUBLIC_URL || ''}/service-worker.js`)
      .then((registration) => {
        /* A new deploy leaves a waiting worker; take over at once so the running
           tab is not pinned to the previous version until it is closed. */
        registration.addEventListener('updatefound', () => {
          const installing = registration.installing;
          if (!installing) return;
          installing.addEventListener('statechange', () => {
            if (installing.state === 'installed' && navigator.serviceWorker.controller) {
              installing.postMessage({ type: 'SKIP_WAITING' });
            }
          });
        });
      })
      .catch(() => { /* offline or unsupported: the site still works, just uncached */ });
  });
};

registerServiceWorker();

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <ToastProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ToastProvider>
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
