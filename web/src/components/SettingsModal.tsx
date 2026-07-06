import { useEffect, useState, type FormEvent } from "react";

import * as api from "../api/client";
import { ApiError } from "../api/client";
import { useAuth } from "../auth";
import type { User } from "../types";
import { CalendarConnect } from "./CalendarConnect";
import { PushPermissionPanel } from "./PushPermissionPanel";
import { TwoFactorSettings } from "./TwoFactorSettings";

/** Google-only accounts can add a local password here, enabling email sign-in. */
function SetPasswordForm() {
  const { refresh } = useAuth();
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      await api.setPassword(pw);
      await refresh(); // has_password flips; this form unmounts
    } catch (ex) {
      setErr(ex instanceof ApiError ? ex.message : "Something went wrong");
      setBusy(false);
    }
  }

  return (
    <form className="setpw" onSubmit={submit}>
      <p>This account signs in with Google. Set a password to also sign in with email.</p>
      <input
        className="addinput"
        type="password"
        placeholder="new password (min 6 chars)"
        autoComplete="new-password"
        minLength={6}
        required
        value={pw}
        onChange={(e) => setPw(e.target.value)}
      />
      {err && <div className="err">{err}</div>}
      <button className="btn" type="submit" disabled={busy || pw.length < 6}>
        {busy ? "…" : "Set password"}
      </button>
    </form>
  );
}

/** Irreversible account deletion, in a confirmation popup. Two gates: the user
 *  types DELETE and (if the account has one) supplies their password. */
function DeleteAccountModal({ user, onClose }: { user: User; onClose: () => void }) {
  const { deleteAccount } = useAuth();
  const [pw, setPw] = useState("");
  const [code, setCode] = useState("");
  const [phrase, setPhrase] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const ready =
    phrase.trim().toUpperCase() === "DELETE" &&
    (!user.has_password || pw.length > 0) &&
    (!user.two_factor_delete || code.trim().length >= 6);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, busy]);

  async function runDelete(e: FormEvent) {
    e.preventDefault();
    if (!ready || busy) return;
    setErr("");
    setBusy(true);
    try {
      await deleteAccount(
        user.has_password ? pw : undefined,
        user.two_factor_delete ? code.trim() : undefined,
      );
      // Account is gone; reload to the public landing page from a clean slate.
      window.location.assign("/");
    } catch (ex) {
      setErr(ex instanceof ApiError ? ex.message : "Something went wrong");
      setBusy(false);
    }
  }

  return (
    <div
      className="scrim confirm-scrim"
      onClick={(e) => e.target === e.currentTarget && !busy && onClose()}
    >
      <form
        className="modal confirm-modal acct-delete-modal"
        role="alertdialog"
        aria-modal="true"
        onSubmit={runDelete}
      >
        <header>
          <span className="ic" style={{ color: "var(--red)" }}>
            ⚠
          </span>
          <h3>Delete account?</h3>
        </header>
        <div className="pad">
          <p className="confirm-msg">
            This permanently deletes your account and <b>all</b> your data — items,
            checkpoints, snapshots, domains and any calendar connection. This cannot be
            undone.
          </p>
          <div className="acct-delete-fields">
            {user.has_password && (
              <input
                className="addinput"
                type="password"
                placeholder="your password"
                autoComplete="current-password"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                autoFocus
              />
            )}
            {user.two_factor_delete && (
              <input
                className="addinput"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="two-factor code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            )}
            <input
              className="addinput"
              type="text"
              placeholder="type DELETE to confirm"
              autoCapitalize="characters"
              autoComplete="off"
              value={phrase}
              onChange={(e) => setPhrase(e.target.value)}
              autoFocus={!user.has_password}
            />
          </div>
          {err && <div className="err">{err}</div>}
        </div>
        <footer>
          <button type="button" className="btn" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button className="btn danger" type="submit" disabled={!ready || busy}>
            {busy ? "Deleting…" : "Delete forever"}
          </button>
        </footer>
      </form>
    </div>
  );
}

/** Account settings, promoted out of the avatar popover (REDESIGN_V1 §WS-6):
 *  security, reminders and calendar get a full modal surface instead of a
 *  280px dropdown. The popover keeps identity + the way in here. */
export function SettingsModal({ user, onClose }: { user: User; onClose: () => void }) {
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !deleteOpen) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, deleteOpen]);

  return (
    <>
      <div className="scrim">
        <div className="modal" role="dialog" aria-modal="true" aria-labelledby="settings-title">
          <header>
            <span className="ic">⚙</span>
            <h3 id="settings-title">Settings</h3>
            <button className="x" onClick={onClose} aria-label="Close settings">
              ×
            </button>
          </header>
          <div className="pad settings-body">
            {!user.has_password && <SetPasswordForm />}
            <TwoFactorSettings />
            <PushPermissionPanel />
            <CalendarConnect />
            <div className="userpanel-legal">
              <a href="/privacy">Privacy</a>
              <span className="sep">·</span>
              <a href="/terms">Terms</a>
            </div>
            <button className="acct-delete-link" onClick={() => setDeleteOpen(true)}>
              Delete account
            </button>
          </div>
          <footer>
            <button className="btn" onClick={onClose}>
              Close
            </button>
          </footer>
        </div>
      </div>
      {deleteOpen && <DeleteAccountModal user={user} onClose={() => setDeleteOpen(false)} />}
    </>
  );
}
