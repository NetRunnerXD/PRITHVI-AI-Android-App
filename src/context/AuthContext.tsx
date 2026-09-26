import React, { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  fetchMe,
  logoutAccount,
  type AuthUser,
} from '../api/auth';
import { hydrateAuthToken } from '../api/persist';

type AuthContextType = {
  account: AuthUser | null;
  authModal: boolean;
  ready: boolean;
  setAccount: (user: AuthUser | null) => void;
  setAuthModal: (open: boolean) => void;
  refreshMe: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<AuthUser | null>(null);
  const [authModal, setAuthModal] = useState(false);
  const [ready, setReady] = useState(false);

  const refreshMe = useCallback(async () => {
    const user = await fetchMe();
    setAccount(user);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await hydrateAuthToken();
      if (cancelled) return;
      const user = await fetchMe();
      if (!cancelled) {
        setAccount(user);
        setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const signOut = useCallback(async () => {
    await logoutAccount();
    setAccount(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ account, authModal, ready, setAccount, setAuthModal, refreshMe, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
