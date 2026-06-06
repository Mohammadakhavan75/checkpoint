import { useEffect, useRef, useState } from "react";

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const GSI_SRC = "https://accounts.google.com/gsi/client";

interface GoogleAccountsId {
  initialize: (config: {
    client_id: string;
    callback: (r: { credential: string }) => void;
  }) => void;
  renderButton: (el: HTMLElement, options: Record<string, unknown>) => void;
}

function gsi(): GoogleAccountsId | undefined {
  return (window as unknown as { google?: { accounts?: { id?: GoogleAccountsId } } }).google
    ?.accounts?.id;
}

/** Ensure the GSI script is present and resolve only once `google.accounts.id` exists. */
function whenReady(): Promise<GoogleAccountsId> {
  return new Promise((resolve, reject) => {
    if (!document.getElementById("gsi-script")) {
      const script = document.createElement("script");
      script.id = "gsi-script";
      script.src = GSI_SRC;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
    const start = Date.now();
    const tick = () => {
      const id = gsi();
      if (id) return resolve(id);
      if (Date.now() - start > 8000)
        return reject(new Error("Google sign-in failed to load"));
      window.setTimeout(tick, 50);
    };
    tick();
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
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!CLIENT_ID) return;
    let cancelled = false;
    whenReady()
      .then((id) => {
        if (cancelled || !ref.current) return;
        ref.current.innerHTML = ""; // avoid a duplicate button on re-run
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
          locale: "en",
        });
      })
      .catch(() => {
        if (cancelled) return;
        setFailed(true);
        onError?.("Could not load Google sign-in (network or ad-blocker?).");
      });
    return () => {
      cancelled = true;
    };
  }, [onCredential, onError]);

  if (!CLIENT_ID) return null;
  if (failed)
    return (
      <div className="hint" style={{ textAlign: "center" }}>
        Google sign-in unavailable
      </div>
    );
  return <div className="gbtn" ref={ref} />;
}
