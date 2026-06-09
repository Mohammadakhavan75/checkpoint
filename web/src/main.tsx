import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { App } from "./App";
import { setupCrossTabSync } from "./api/sync";
import { AuthProvider } from "./auth";
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

// Keep all tabs of this browser in sync the instant data changes.
setupCrossTabSync(queryClient);

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);
