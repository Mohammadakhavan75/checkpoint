import { useEffect, useRef, useState, type FormEvent } from "react";

import * as api from "../api/client";
import { ApiError } from "../api/client";
import { useAuth } from "../auth";
import type { User } from "../types";
import { CalendarConnect } from "./CalendarConnect";
import { TwoFactorSettings } from "./TwoFactorSettings";

function Avatar({ user, className }: { user: User; className: string }) {
  const initial = (user.name || user.email || "?").trim().charAt(0).toUpperCase();
  if (user.picture) {
    return (
      <img
        className={className}
        src={user.picture}
        alt=""
        referrerPolicy="no-referrer"
      />
    );
  }
  return <span className={`${className} uavatar-fallback`}>{initial}</span>;
}

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

export function UserMenu() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  if (!user) return null;
  const displayName = user.name || user.email;

  return (
    <div className="usermenu" ref={ref}>
      <button
        className="usertrigger"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="uname">{displayName}</span>
        <Avatar user={user} className="uavatar" />
      </button>

      {open && (
        <div className="userpanel" role="menu">
          <div className="userpanel-head">
            <Avatar user={user} className="uavatar-lg" />
            <div className="uinfo">
              <div className="uinfo-name">{user.name || "—"}</div>
              <div className="uinfo-email">{user.email}</div>
            </div>
          </div>

          <div className="userpanel-body">
            <div className="userpanel-row">
              <span>Account</span>
              <span className="mono">{user.id.slice(0, 8)}…</span>
            </div>
            <div className="userpanel-row">
              <span>Member since</span>
              <span>{new Date(user.created_at).toLocaleDateString()}</span>
            </div>
            {!user.has_password && <SetPasswordForm />}
            <TwoFactorSettings />
            <CalendarConnect />
            <div className="userpanel-legal">
              <a href="/privacy">Privacy</a>
              <span className="sep">·</span>
              <a href="/terms">Terms</a>
            </div>
            <button
              className="acct-delete-link"
              onClick={() => {
                setOpen(false);
                setDeleteOpen(true);
              }}
            >
              Delete account
            </button>
          </div>

          <button className="btn-danger" onClick={logout}>
            Log out
          </button>
        </div>
      )}

      {deleteOpen && (
        <DeleteAccountModal user={user} onClose={() => setDeleteOpen(false)} />
      )}
    </div>
  );
}
