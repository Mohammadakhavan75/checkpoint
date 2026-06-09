// Checkpoint: StackEdit's PWA service worker is intentionally disabled.
// This editor is embedded in the Checkpoint app and served locally by Vite,
// so StackEdit's offline-plugin worker is unnecessary, and its cache-first
// strategy caused stale assets/content (e.g. theme edits not appearing).
// This kill-switch unregisters any previously installed worker and clears
// its caches, and registers no fetch handler, so nothing is cached.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    } catch (e) { /* ignore */ }
    try {
      await self.registration.unregister();
    } catch (e) { /* ignore */ }
  })());
});
// No 'fetch' listener on purpose: requests go straight to Vite, never cached.
