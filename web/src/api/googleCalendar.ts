// Drives the Google "auth code" popup to obtain an authorization code for the
// calendar.readonly scope. The code is handed to the API, which exchanges it
// server-side (with the client secret) so the refresh token never reaches the
// browser. Reuses the same GSI script the sign-in button loads.

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
const GSI_SRC = "https://accounts.google.com/gsi/client";
const CALENDAR_SCOPE =
  "openid email https://www.googleapis.com/auth/calendar.readonly";

interface CodeClient {
  requestCode: () => void;
}
interface OAuth2 {
  initCodeClient: (cfg: {
    client_id: string;
    scope: string;
    ux_mode: "popup";
    callback: (resp: { code?: string; error?: string }) => void;
  }) => CodeClient;
}

function oauth2(): OAuth2 | undefined {
  return (window as unknown as { google?: { accounts?: { oauth2?: OAuth2 } } }).google
    ?.accounts?.oauth2;
}

function whenReady(): Promise<OAuth2> {
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
      const o = oauth2();
      if (o) return resolve(o);
      if (Date.now() - start > 8000) return reject(new Error("Google failed to load"));
      window.setTimeout(tick, 50);
    };
    tick();
  });
}

/** Open the consent popup and resolve with the one-time authorization code. */
export function requestCalendarAuthCode(): Promise<string> {
  if (!CLIENT_ID) return Promise.reject(new Error("Google is not configured"));
  return new Promise((resolve, reject) => {
    whenReady()
      .then((o) => {
        const client = o.initCodeClient({
          client_id: CLIENT_ID,
          scope: CALENDAR_SCOPE,
          ux_mode: "popup",
          callback: (resp) => {
            if (resp.code) resolve(resp.code);
            else reject(new Error(resp.error || "Authorization cancelled"));
          },
        });
        client.requestCode();
      })
      .catch(reject);
  });
}
