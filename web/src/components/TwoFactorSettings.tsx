import { useEffect, useState, type FormEvent } from "react";

import * as api from "../api/client";
import { ApiError } from "../api/client";
import { useProviders } from "../api/hooks";
import { useAuth } from "../auth";
import type { TwoFactorSetup, TwoFactorStatus } from "../types";

type View = "loading" | "off" | "setup" | "codes" | "on";

function msg(e: unknown): string {
  return e instanceof ApiError || e instanceof Error ? e.message : "Something went wrong";
}

/** The shown-once recovery codes screen. */
function RecoveryCodes({ codes, onDone }: { codes: string[]; onDone: () => void }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(codes.join("\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard may be blocked; the codes are visible to copy by hand */
    }
  }
  return (
    <div className="tfa-codes">
      <p className="tfa-note">
        Save these <b>recovery codes</b> somewhere safe. Each works once if you lose your
        authenticator. They won't be shown again.
      </p>
      <ul className="tfa-codelist">
        {codes.map((c) => (
          <li key={c} className="mono">
            {c}
          </li>
        ))}
      </ul>
      <div className="tfa-actions">
        <button className="btn" onClick={copy}>
          {copied ? "Copied ✓" : "Copy codes"}
        </button>
        <button className="btn amber" onClick={onDone}>
          I've saved them
        </button>
      </div>
    </div>
  );
}

/** Enroll a TOTP authenticator and choose where the code is required. Renders
 *  nothing unless the server has 2FA configured (an at-rest encryption key). */
export function TwoFactorSettings() {
  const providers = useProviders();
  const { refresh } = useAuth();
  const available = !!providers.data?.two_factor;

  const [view, setView] = useState<View>("loading");
  const [status, setStatus] = useState<TwoFactorStatus | null>(null);
  const [setup, setSetup] = useState<TwoFactorSetup | null>(null);
  const [codes, setCodes] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  // enrollment form
  const [code, setCode] = useState("");
  const [forLogin, setForLogin] = useState(true);
  const [forDelete, setForDelete] = useState(true);
  // disable / regenerate prompt
  const [manage, setManage] = useState<null | "disable" | "regen">(null);
  const [manageCode, setManageCode] = useState("");

  useEffect(() => {
    if (!available) return;
    let alive = true;
    api
      .getTwoFactorStatus()
      .then((s) => {
        if (!alive) return;
        setStatus(s);
        setView(s.enabled ? "on" : "off");
      })
      .catch(() => alive && setView("off"));
    return () => {
      alive = false;
    };
  }, [available]);

  if (!available) return null;

  async function reloadStatus(next: View) {
    const s = await api.getTwoFactorStatus();
    setStatus(s);
    setView(next);
  }

  async function startSetup() {
    setErr("");
    setBusy(true);
    try {
      setSetup(await api.setupTwoFactor());
      setCode("");
      setForLogin(true);
      setForDelete(true);
      setView("setup");
    } catch (e) {
      setErr(msg(e));
    } finally {
      setBusy(false);
    }
  }

  async function enable(e: FormEvent) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      const r = await api.enableTwoFactor(code.trim(), forLogin, forDelete);
      setCodes(r.recovery_codes);
      await refresh(); // user.two_factor_* now reflects the new state
      setView("codes");
    } catch (ex) {
      setErr(msg(ex));
    } finally {
      setBusy(false);
    }
  }

  async function toggleScope(which: "login" | "delete", value: boolean) {
    if (!status) return;
    const login = which === "login" ? value : status.require_for_login;
    const del = which === "delete" ? value : status.require_for_delete;
    if (!login && !del) {
      setErr("Keep your code required in at least one place, or turn 2FA off.");
      return;
    }
    setErr("");
    // optimistic
    setStatus({ ...status, require_for_login: login, require_for_delete: del });
    try {
      const s = await api.updateTwoFactorScopes(login, del);
      setStatus(s);
      await refresh();
    } catch (e) {
      setErr(msg(e));
      await reloadStatus("on");
    }
  }

  async function runManage(e: FormEvent) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      if (manage === "disable") {
        await api.disableTwoFactor(manageCode.trim());
        await refresh();
        setManage(null);
        setManageCode("");
        await reloadStatus("off");
      } else if (manage === "regen") {
        const r = await api.regenerateRecoveryCodes(manageCode.trim());
        setCodes(r.recovery_codes);
        setManage(null);
        setManageCode("");
        setView("codes");
      }
    } catch (ex) {
      setErr(msg(ex));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="tfa userpanel-section">
      <div className="tfa-head">
        <span>Two-step verification</span>
        {view === "on" && <span className="cal-dot ok" title="enabled" />}
      </div>

      {view === "loading" && <p className="tfa-note">…</p>}

      {view === "off" && (
        <>
          <p className="tfa-note">
            Add a one-time code from an authenticator app (Google Authenticator, Authy, …)
            on top of your password. You choose where it's required.
          </p>
          <button className="btn" onClick={startSetup} disabled={busy}>
            {busy ? "…" : "Set up two-step verification"}
          </button>
        </>
      )}

      {view === "setup" && setup && (
        <form className="tfa-setup" onSubmit={enable}>
          <p className="tfa-note">
            Scan this with your authenticator app, or enter the key by hand, then type the
            6-digit code it shows.
          </p>
          <img className="tfa-qr" src={setup.qr_svg} alt="QR code for authenticator setup" />
          <div className="tfa-secret">
            <span className="tfa-secret-label">Setup key</span>
            <code className="mono">{setup.secret}</code>
          </div>
          <label className="tfa-check">
            <input
              type="checkbox"
              checked={forLogin}
              onChange={(e) => setForLogin(e.target.checked)}
            />
            Require a code when signing in
          </label>
          <label className="tfa-check">
            <input
              type="checkbox"
              checked={forDelete}
              onChange={(e) => setForDelete(e.target.checked)}
            />
            Require a code to delete my account
          </label>
          <input
            className="addinput"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="6-digit code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          {err && <div className="err">{err}</div>}
          <div className="tfa-actions">
            <button
              type="button"
              className="btn ghost"
              onClick={() => {
                setView("off");
                setErr("");
              }}
              disabled={busy}
            >
              Cancel
            </button>
            <button
              className="btn amber"
              type="submit"
              disabled={busy || code.trim().length < 6 || (!forLogin && !forDelete)}
            >
              {busy ? "…" : "Turn on"}
            </button>
          </div>
        </form>
      )}

      {view === "codes" && (
        <RecoveryCodes
          codes={codes}
          onDone={() => {
            setCodes([]);
            reloadStatus("on").catch(() => setView("on"));
          }}
        />
      )}

      {view === "on" && status && (
        <>
          <p className="tfa-note">Two-step verification is on. A code is required when:</p>
          <label className="tfa-check">
            <input
              type="checkbox"
              checked={status.require_for_login}
              onChange={(e) => toggleScope("login", e.target.checked)}
            />
            Signing in
          </label>
          <label className="tfa-check">
            <input
              type="checkbox"
              checked={status.require_for_delete}
              onChange={(e) => toggleScope("delete", e.target.checked)}
            />
            Deleting my account
          </label>
          <div className="tfa-row">
            <span>Recovery codes left</span>
            <span className="mono">{status.recovery_codes_remaining}</span>
          </div>

          {manage ? (
            <form className="tfa-manage" onSubmit={runManage}>
              <p className="tfa-note">
                {manage === "disable"
                  ? "Enter a current code (or a recovery code) to turn off two-step verification."
                  : "Enter a current code to generate a fresh set of recovery codes — the old ones stop working."}
              </p>
              <input
                className="addinput"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="code"
                value={manageCode}
                onChange={(e) => setManageCode(e.target.value)}
                autoFocus
              />
              {err && <div className="err">{err}</div>}
              <div className="tfa-actions">
                <button
                  type="button"
                  className="btn ghost"
                  onClick={() => {
                    setManage(null);
                    setManageCode("");
                    setErr("");
                  }}
                  disabled={busy}
                >
                  Cancel
                </button>
                <button
                  className={manage === "disable" ? "btn danger" : "btn"}
                  type="submit"
                  disabled={busy || manageCode.trim().length < 6}
                >
                  {busy ? "…" : manage === "disable" ? "Turn off" : "Regenerate"}
                </button>
              </div>
            </form>
          ) : (
            <div className="tfa-actions">
              <button className="btn" onClick={() => setManage("regen")}>
                New recovery codes
              </button>
              <button className="btn ghost" onClick={() => setManage("disable")}>
                Turn off
              </button>
            </div>
          )}
          {err && !manage && <div className="err">{err}</div>}
        </>
      )}
    </div>
  );
}
