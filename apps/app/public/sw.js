// Sporlo service worker — Sprint 0 shell only. Phase 2 (Events) layers the
// IndexedDB sync queue for offline match reporting + ticket scanning on top
// of this skeleton. Today: registers, does nothing.

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", () => {
  // No-op pass-through. Phase 2 adds cache strategies.
});
