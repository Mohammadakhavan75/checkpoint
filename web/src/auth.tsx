import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";

import * as api from "./api/client";
import { TOKEN_KEY } from "./api/client";
import type { User } from "./types";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  loginWithGoogle: (credential: string) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!api.getToken()) {
      setLoading(false);
      return;
    }
    api
      .me()
      .then(setUser)
      .catch(() => api.setToken(null))
      .finally(() => setLoading(false));
  }, []);

  // Keep the login state consistent across tabs in this browser. When another
  // tab logs in/out or switches account, the token in localStorage changes and
  // fires a storage event here; adopt the new session and drop cached data that
  // belonged to the old one.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== TOKEN_KEY) return;
      const token = api.syncToken();
      qc.clear();
      if (!token) {
        setUser(null);
        return;
      }
      setLoading(true);
      api
        .me()
        .then(setUser)
        .catch(() => {
          api.setToken(null);
          setUser(null);
        })
        .finally(() => setLoading(false));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [qc]);

  async function login(email: string, password: string) {
    const { access_token } = await api.login(email, password);
    api.setToken(access_token);
    setUser(await api.me());
  }

  async function register(email: string, password: string) {
    await api.register(email, password);
    await login(email, password);
  }

  async function loginWithGoogle(credential: string) {
    const { access_token } = await api.googleLogin(credential);
    api.setToken(access_token);
    setUser(await api.me());
  }

  function logout() {
    api.setToken(null);
    setUser(null);
  }

  // Re-pull the profile after server-side account changes (e.g. set password).
  async function refresh() {
    setUser(await api.me());
  }

  return (
    <AuthContext.Provider
      value={{ user, loading, login, register, loginWithGoogle, logout, refresh }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
