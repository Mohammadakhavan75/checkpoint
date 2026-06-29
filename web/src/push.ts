// Browser Web Push plumbing (ADR-001). Keeps the permission/subscribe dance and
// the VAPID key encoding out of the React components.
import * as api from "./api/client";

export type PushSupport = "ok" | "unsupported";

/** Push needs a service worker, the Push API, and the Notifications API. iOS
 *  Safari only exposes these inside an installed (Home-Screen) PWA. */
export function pushSupport(): PushSupport {
  const ok =
    typeof navigator !== "undefined" &&
    "serviceWorker" in navigator &&
    typeof window !== "undefined" &&
    "PushManager" in window &&
    "Notification" in window;
  return ok ? "ok" : "unsupported";
}

export function permissionState(): NotificationPermission | "unsupported" {
  if (pushSupport() !== "ok") return "unsupported";
  return Notification.permission;
}

// VAPID applicationServerKey is base64url; subscribe() wants a BufferSource.
// Back it with an explicit ArrayBuffer so the type is ArrayBuffer (not the
// ArrayBufferLike that fails strict lib checks).
function urlBase64ToBuffer(base64: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const normalized = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(normalized);
  const buffer = new ArrayBuffer(raw.length);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; i++) view[i] = raw.charCodeAt(i);
  return buffer;
}

export async function getRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (pushSupport() !== "ok") return null;
  try {
    return await navigator.serviceWorker.ready;
  } catch {
    return null;
  }
}

export type SubscribeResult = "subscribed" | "denied" | "unsupported" | "error";

/** Two-step grant: ask the browser, then subscribe + register with the API.
 *  Called only from an explicit user click (never auto-prompt). */
export async function subscribeToPush(): Promise<SubscribeResult> {
  if (pushSupport() !== "ok") return "unsupported";
  let permission: NotificationPermission;
  try {
    permission = await Notification.requestPermission();
  } catch {
    return "error";
  }
  if (permission !== "granted") return "denied";

  try {
    const reg = await getRegistration();
    if (!reg) return "error";
    const { key } = await api.getVapidKey();
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToBuffer(key),
      });
    }
    const json = sub.toJSON() as {
      endpoint?: string;
      keys?: { p256dh?: string; auth?: string };
    };
    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return "error";
    await api.createPushSubscription({
      endpoint: json.endpoint,
      keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
      user_agent: navigator.userAgent,
    });
    return "subscribed";
  } catch {
    return "error";
  }
}

/** Drop the browser-side subscription (server row is removed via the devices
 *  list). Best-effort. */
export async function unsubscribeFromPush(): Promise<void> {
  const reg = await getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  await sub?.unsubscribe().catch(() => {});
}
