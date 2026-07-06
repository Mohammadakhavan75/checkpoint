import { useEffect, useRef, useState } from "react";

import { useAuth } from "../auth";
import type { User } from "../types";
import { SettingsModal } from "./SettingsModal";

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

// Identity popover only — security/reminders/calendar/deletion live in the
// Settings modal now (REDESIGN_V1 §WS-6), so this fits on any viewport.
export function UserMenu() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
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
              <span>Member since</span>
              <span>{new Date(user.created_at).toLocaleDateString()}</span>
            </div>
            <button
              className="btn settings-open"
              onClick={() => {
                setOpen(false);
                setSettingsOpen(true);
              }}
            >
              ⚙ Settings
            </button>
          </div>

          <button className="btn-danger" onClick={logout}>
            Log out
          </button>
        </div>
      )}

      {settingsOpen && <SettingsModal user={user} onClose={() => setSettingsOpen(false)} />}
    </div>
  );
}
