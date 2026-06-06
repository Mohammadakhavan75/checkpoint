import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

import * as api from "./api/client";
import type { User } from "./types";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  loginWithGoogle: (credential: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
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

  return (
    <AuthContext.Provider
      value={{ user, loading, login, register, loginWithGoogle, logout }}
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
