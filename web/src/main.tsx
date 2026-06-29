import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { App } from "./App";
import { setupCrossTabSync } from "./api/sync";
import { AuthProvider } from "./auth";
import { LegalView, type LegalPage } from "./views/LegalView";
import "./styles/app.css";

// How often open sessions poll the API to pick up changes made elsewhere
// (e.g. the same account on another device). Same-browser tabs also sync
// instantly via BroadcastChannel; this interval is the cross-device floor.
const SYNC_POLL_MS = 15_000;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 10_000,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      refetchInterval: SYNC_POLL_MS,
      // Don't poll while the tab is hidden; refetchOnWindowFocus catches up.
      refetchIntervalInBackground: false,
    },
  },
});

// Public, auth-free legal pages. Matched from the path before any auth or data
// providers mount, so /privacy and /terms render standalone for anyone with the
// link (the Vite preview/dev server falls back to index.html for these paths).
const LEGAL_ROUTES: Record<string, LegalPage> = {
  "/privacy": "privacy",
  "/terms": "terms",
};
const path = window.location.pathname.replace(/\/+$/, "") || "/";
const legalPage = LEGAL_ROUTES[path];

const root = ReactDOM.createRoot(document.getElementById("root") as HTMLElement);

if (legalPage) {
  root.render(
    <React.StrictMode>
      <LegalView page={legalPage} />
    </React.StrictMode>,
  );
} else {
  // Keep all tabs of this browser in sync the instant data changes.
  setupCrossTabSync(queryClient);

  // Register the Web Push service worker (ADR-001). Guarded so unsupported
  // browsers (and iOS Safari outside an installed PWA) silently skip it; the
  // reminder UI handles "push unavailable here" on its own.
  if ("serviceWorker" in navigator && "PushManager" in window) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* best-effort; reminders degrade to in-app when this fails */
      });
    });
  }

  root.render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </QueryClientProvider>
    </React.StrictMode>,
  );
}
