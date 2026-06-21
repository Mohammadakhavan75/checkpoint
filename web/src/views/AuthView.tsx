import { useCallback, useState, type FormEvent } from "react";

import { useAuth } from "../auth";
import { ApiError } from "../api/client";
import { GoogleSignInButton, googleEnabled } from "../components/GoogleSignInButton";

export function AuthView() {
  const { login, register, loginWithGoogle } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      if (mode === "login") await login(email, password);
      else await register(email, password);
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
        await loginWithGoogle(credential);
      } catch (ex) {
        setErr(ex instanceof ApiError ? ex.message : "Google sign-in failed");
      } finally {
        setBusy(false);
      }
    },
    [loginWithGoogle],
  );

  return (
    <div className="authwrap">
      <div className="authcard">
        <a className="brand" href="/">
          CHECK<b>//</b>POINT
        </a>
        <div className="sub">// {mode === "login" ? "sign in to resume" : "create an account"}</div>
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
