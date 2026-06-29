// Checkpoint service worker — Web Push only (ADR-001). Deliberately tiny and
// versioned (bump SW_VERSION to force an update). No fetch/caching handler: the
// app is server-prerendered and we don't want an offline cache fighting deploys.
const SW_VERSION = "reminders-v1";

self.addEventListener("install", () => {
  // Activate this version immediately instead of waiting for old tabs to close.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// A push arrives with a JSON payload built by services/reminders.py:
//   { title, body, data: { url } }
self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { title: "Checkpoint", body: event.data ? event.data.text() : "" };
  }
  const title = payload.title || "Checkpoint";
  const url = (payload.data && payload.data.url) || "/";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: payload.body || "",
      // App icons are served from /; fall back gracefully if absent.
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag: url, // collapse repeats for the same target
      data: { url },
      // No vibration/renotify — anti-urgency (forgiveness, not alarm).
    }),
  );
});

// Tap → focus an existing tab if one is open, else open the deep link. The Today
// letter card greets the user with the same item on arrival (?resume={id}).
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        for (const client of clients) {
          if ("focus" in client) {
            client.focus();
            if ("navigate" in client) client.navigate(url).catch(() => {});
            return;
          }
        }
        return self.clients.openWindow(url);
      }),
  );
});
