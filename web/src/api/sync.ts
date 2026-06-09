import type { QueryClient } from "@tanstack/react-query";

// Cross-tab sync for sessions open in the SAME browser. BroadcastChannel is
// origin-scoped, so messages only reach other tabs of this app. Cross-device
// sync is handled separately by query polling / refetch-on-focus.
const CHANNEL = "checkpoint-sync";
const MSG = "data-changed";
const PING_KEY = `${CHANNEL}:ping`;

function makeChannel(): BroadcastChannel | null {
  if (typeof BroadcastChannel === "undefined") return null;
  try {
    return new BroadcastChannel(CHANNEL);
  } catch {
    return null;
  }
}

// Wire instant cross-tab data sync:
//  - a successful mutation in this tab tells other tabs to refetch
//  - a signal from another tab refetches this tab's active queries
// BroadcastChannel never echoes to the sender, so there is no loop.
// Returns a cleanup function.
export function setupCrossTabSync(qc: QueryClient): () => void {
  const channel = makeChannel();

  const refetchAll = () => qc.invalidateQueries();

  const onMessage = (e: MessageEvent) => {
    if (e.data === MSG) refetchAll();
  };
  // Fallback for browsers without BroadcastChannel (writes don't fire storage
  // events in the originating tab, so this also avoids self-notification).
  const onStorage = (e: StorageEvent) => {
    if (e.key === PING_KEY) refetchAll();
  };

  if (channel) channel.addEventListener("message", onMessage);
  else window.addEventListener("storage", onStorage);

  const broadcast = () => {
    if (channel) {
      channel.postMessage(MSG);
    } else {
      try {
        localStorage.setItem(PING_KEY, String(Date.now()));
      } catch {
        /* ignore */
      }
    }
  };

  const unsubscribe = qc.getMutationCache().subscribe((event) => {
    if (event.type === "updated" && event.action?.type === "success") {
      broadcast();
    }
  });

  return () => {
    unsubscribe();
    if (channel) {
      channel.removeEventListener("message", onMessage);
      channel.close();
    } else {
      window.removeEventListener("storage", onStorage);
    }
  };
}
