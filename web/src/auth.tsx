import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";

import * as api from "./api/client";
import { TOKEN_KEY } from "./api/client";
import type { User } from "./types";

// When 2FA gates login, the first leg returns a challenge instead of a session;
// the caller collects a code and calls completeMfaLogin. null = signed in.
export interface MfaChallenge {
  mfaToken: string;
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<MfaChallenge | null>;
  register: (email: string, password: string) => Promise<MfaChallenge | null>;
  loginWithGoogle: (credential: string) => Promise<MfaChallenge | null>;
  completeMfaLogin: (mfaToken: string, code: string) => Promise<void>;
  logout: () => void;
  deleteAccount: (password?: string, code?: string) => Promise<void>;
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

  // Adopt a session token from a login response, or surface a 2FA challenge.
  async function adopt(result: {
    access_token?: string | null;
    mfa_required: boolean;
    mfa_token?: string | null;
  }): Promise<MfaChallenge | null> {
    if (result.mfa_required && result.mfa_token) {
      return { mfaToken: result.mfa_token };
    }
    if (result.access_token) {
      api.setToken(result.access_token);
      setUser(await api.me());
    }
    return null;
  }

  async function login(email: string, password: string) {
    return adopt(await api.login(email, password));
  }

  async function register(email: string, password: string) {
    // A brand-new account has no 2FA yet, so this never returns a challenge.
    await api.register(email, password);
    return login(email, password);
  }

  async function loginWithGoogle(credential: string) {
    return adopt(await api.googleLogin(credential));
  }

  // Second leg of a 2FA login: trade the mfa_token + code for a session.
  async function completeMfaLogin(mfaToken: string, code: string) {
    const { access_token } = await api.completeLoginMfa(mfaToken, code);
    if (access_token) {
      api.setToken(access_token);
      setUser(await api.me());
    }
  }

  function logout() {
    api.setToken(null);
    setUser(null);
  }

  // Irreversibly delete the account server-side, then tear down the local
  // session exactly like a logout (drop the token, clear cached data). The
  // bearer token is dead the moment the user row is gone.
  async function deleteAccount(password?: string, code?: string) {
    await api.deleteAccount(password, code);
    api.setToken(null);
    qc.clear();
    setUser(null);
  }

  // Re-pull the profile after server-side account changes (e.g. set password).
  async function refresh() {
    setUser(await api.me());
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        loginWithGoogle,
        completeMfaLogin,
        logout,
        deleteAccount,
        refresh,
      }}
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
