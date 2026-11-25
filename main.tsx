import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';

// Automatically handle Vite code-splitting chunk update failures
window.addEventListener('vite:preloadError', () => {
  console.warn('Vite chunk preload error detected; reloading page with fresh assets...');
  window.location.reload();
});

// Register service worker for offline capabilities and PWA compliance
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      // Remove any older cache entries that cached Vite dev modules (.vite/deps or /src/)
      if ('caches' in window) {
        const cacheKeys = await caches.keys();
        for (const key of cacheKeys) {
          if (key !== 'dilip-yadav-dairy-v29') {
            await caches.delete(key);
          }
        }
      }
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('SW registered successfully with scope:', registration.scope);
      if (registration.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
      registration.update().catch(() => {});
    } catch (err) {
      console.warn('SW registration warning:', err);
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
