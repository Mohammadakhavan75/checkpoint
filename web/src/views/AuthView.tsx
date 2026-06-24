import { useCallback, useState, type FormEvent } from "react";

import { useAuth, type MfaChallenge } from "../auth";
import { ApiError } from "../api/client";
import { GoogleSignInButton, googleEnabled } from "../components/GoogleSignInButton";

export function AuthView() {
  const { login, register, loginWithGoogle, completeMfaLogin } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  // Set when login clears the first factor but 2FA is required; switches the
  // card to the code-entry step.
  const [challenge, setChallenge] = useState<MfaChallenge | null>(null);
  const [code, setCode] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      const next =
        mode === "login"
          ? await login(email, password)
          : await register(email, password);
      if (next) setChallenge(next);
    } catch (ex) {
      setErr(ex instanceof ApiError ? ex.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  const onGoogle = useCallback(
    async (credential: string) => {
      setErr("");
      setBusy(true);
      try {
        const next = await loginWithGoogle(credential);
        if (next) setChallenge(next);
      } catch (ex) {
        setErr(ex instanceof ApiError ? ex.message : "Google sign-in failed");
      } finally {
        setBusy(false);
      }
    },
    [loginWithGoogle],
  );

  async function submitCode(e: FormEvent) {
    e.preventDefault();
    if (!challenge) return;
    setErr("");
    setBusy(true);
    try {
      await completeMfaLogin(challenge.mfaToken, code.trim());
      // success unmounts this view (App swaps to the dashboard)
    } catch (ex) {
      setErr(ex instanceof ApiError ? ex.message : "Something went wrong");
      setBusy(false);
    }
  }

  function cancelChallenge() {
    setChallenge(null);
    setCode("");
    setErr("");
    setPassword("");
  }

  return (
    <div className="authwrap">
      <div className="authcard">
        <a className="brand" href="/">
          CHECK<b>//</b>POINT
        </a>
        {challenge ? (
          <>
            <div className="sub">// two-factor authentication</div>
            <form onSubmit={submitCode}>
              <div className="field">
                <label>Authentication code</label>
                <input
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="6-digit code or recovery code"
                  value={code}
                  autoFocus
                  onChange={(e) => setCode(e.target.value)}
                />
              </div>
              <p className="hint">
                Open your authenticator app and enter the current code. Lost your
                device? Use one of your recovery codes.
              </p>
              {err && <div className="err">{err}</div>}
              <button
                className="btn amber"
                type="submit"
                style={{ width: "100%", padding: 11 }}
                disabled={busy || code.trim().length < 6}
              >
                {busy ? "…" : "Verify"}
              </button>
            </form>
            <div className="switch">
              <button onClick={cancelChallenge}>← back to sign in</button>
            </div>
          </>
        ) : (
          <>
            <div className="sub">
              // {mode === "login" ? "sign in to resume" : "create an account"}
            </div>
            <form onSubmit={submit}>
              <div className="field">
                <label>Email</label>
                <input
                  type="email"
                  value={email}
                  autoFocus
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="field">
                <label>Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              {err && <div className="err">{err}</div>}
              <button
                className="btn amber"
                type="submit"
                style={{ width: "100%", padding: 11 }}
                disabled={busy}
              >
                {busy ? "…" : mode === "login" ? "Sign in" : "Register"}
              </button>
            </form>
            {googleEnabled && (
              <>
                <div className="divider">
                  <span>or</span>
                </div>
                <GoogleSignInButton onCredential={onGoogle} onError={setErr} />
              </>
            )}
            <div className="switch">
              {mode === "login" ? "no account?" : "have an account?"}{" "}
              <button
                onClick={() => {
                  setMode((m) => (m === "login" ? "register" : "login"));
                  setErr("");
                }}
              >
                {mode === "login" ? "register" : "sign in"}
              </button>
            </div>
          </>
        )}
      </div>
      <div className="auth-legal">
        <a href="/">Home</a>
        <span className="sep">·</span>
        <a href="/privacy">Privacy</a>
        <span className="sep">·</span>
        <a href="/terms">Terms</a>
      </div>
    </div>
  );
}
