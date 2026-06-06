import { useEffect, useRef } from "react";

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const GSI_SRC = "https://accounts.google.com/gsi/client";

interface GoogleAccountsId {
  initialize: (config: { client_id: string; callback: (r: { credential: string }) => void }) => void;
  renderButton: (el: HTMLElement, options: Record<string, unknown>) => void;
}

function gsi(): GoogleAccountsId | undefined {
  return (window as unknown as { google?: { accounts?: { id?: GoogleAccountsId } } }).google
    ?.accounts?.id;
}

function loadGsi(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.getElementById("gsi-script")) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.id = "gsi-script";
    script.src = GSI_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Could not load Google sign-in"));
    document.head.appendChild(script);
  });
}

export const googleEnabled = !!CLIENT_ID;

export function GoogleSignInButton({
  onCredential,
  onError,
}: {
  onCredential: (credential: string) => void;
  onError?: (message: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!CLIENT_ID) return;
    let cancelled = false;
    loadGsi()
      .then(() => {
        if (cancelled) return;
        const id = gsi();
        if (!id || !ref.current) return;
        id.initialize({
          client_id: CLIENT_ID,
          callback: (r) => onCredential(r.credential),
        });
        id.renderButton(ref.current, {
          theme: "filled_black",
          size: "large",
          shape: "pill",
          text: "continue_with",
          width: 320,
        });
      })
      .catch(() => onError?.("Could not load Google sign-in"));
    return () => {
      cancelled = true;
    };
  }, [onCredential, onError]);

  if (!CLIENT_ID) return null;
  return <div className="gbtn" ref={ref} />;
}
