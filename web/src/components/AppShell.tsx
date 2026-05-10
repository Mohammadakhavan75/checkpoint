import { Archive, ChevronLeft, ChevronRight, Home, Layers3, LogOut, Settings, UserRound } from "lucide-react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";

import { api } from "../lib/api";
import { useAuth } from "../lib/auth";

const navItems = [
  { to: "/today", label: "Today", icon: Home },
  { to: "/life-index", label: "Life Index", icon: Layers3 },
  { to: "/parking", label: "Parking", icon: Archive },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function AppShell() {
  const { user, preferences, setPreferences, logout } = useAuth();
  const navigate = useNavigate();
  const collapsed = preferences?.nav_collapsed ?? true;

  async function toggleNav() {
    const updated = await api.updatePreferences({ nav_collapsed: !collapsed });
    setPreferences(updated);
  }

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className={`app-shell ${collapsed ? "nav-collapsed" : "nav-expanded"}`}>
      <aside className="side-rail" aria-label="Primary navigation">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true" />
          {!collapsed && <span className="brand-name">Checkpoint</span>}
        </div>

        <nav className="nav-list">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink key={item.to} to={item.to} className="nav-item" title={collapsed ? item.label : undefined}>
                <Icon size={22} strokeWidth={1.8} />
                {!collapsed && <span>{item.label}</span>}
              </NavLink>
            );
          })}
        </nav>

        <button className="rail-toggle" type="button" onClick={toggleNav} aria-label={collapsed ? "Expand side panel" : "Collapse side panel"}>
          {collapsed ? <ChevronRight size={22} /> : <ChevronLeft size={22} />}
        </button>
      </aside>

      <main className="main-surface">
        <header className="top-bar">
          <div className="top-spacer" />
          <div className="top-meta">
            <span className="active-limit">Active limit: {preferences?.active_limit ?? 1}</span>
            <span className="info-dot">i</span>
            <div className="account-chip" aria-label="Current account">
              <span className="avatar">{user?.email.slice(0, 2).toUpperCase() ?? <UserRound size={16} />}</span>
              <span className="account-name">{user?.email.split("@")[0] ?? "Account"}</span>
            </div>
            <button className="icon-button" type="button" onClick={handleLogout} aria-label="Log out">
              <LogOut size={18} />
            </button>
          </div>
        </header>
        <Outlet />
      </main>
    </div>
  );
}
