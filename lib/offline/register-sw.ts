'use client';

import { Workbox } from 'workbox-window';

export function registerServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  const wb = new Workbox('/sw.js');

  wb.addEventListener('installed', (event) => {
    if (event.isUpdate) {
      console.log('New service worker installed. Refresh to update.');
      // Optionally prompt user to refresh
    } else {
      console.log('Service worker installed for the first time.');
    }
  });

  wb.addEventListener('activated', (event) => {
    if (!event.isUpdate) {
      console.log('Service worker activated for the first time.');
    }
  });

  wb.register();
}
