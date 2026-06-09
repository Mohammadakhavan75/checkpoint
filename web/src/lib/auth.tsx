import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import { api, type AuthPayload } from "./api";
import type { Preferences, User } from "./types";

type AuthState = {
  user: User | null;
  preferences: Preferences | null;
  loading: boolean;
  setPreferences: (preferences: Preferences) => void;
  signup: (email: string, password: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshMe: () => Promise<void>;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [preferences, setPreferences] = useState<Preferences | null>(null);
  const [loading, setLoading] = useState(true);

  const applyAuth = useCallback((payload: AuthPayload) => {
    setUser(payload.user);
    setPreferences(payload.preferences);
  }, []);

  const refreshMe = useCallback(async () => {
    setLoading(true);
    try {
      applyAuth(await api.me());
    } catch {
      setUser(null);
      setPreferences(null);
    } finally {
      setLoading(false);
    }
  }, [applyAuth]);

  useEffect(() => {
    void refreshMe();
  }, [refreshMe]);

  const value = useMemo<AuthState>(
    () => ({
      user,
      preferences,
      loading,
      setPreferences,
      signup: async (email, password) => applyAuth(await api.signup(email, password)),
      login: async (email, password) => applyAuth(await api.login(email, password)),
      logout: async () => {
        await api.logout();
        setUser(null);
        setPreferences(null);
      },
      refreshMe,
    }),
    [applyAuth, loading, preferences, refreshMe, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}
