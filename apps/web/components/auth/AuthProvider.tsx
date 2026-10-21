'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { SessionUser } from '@healthcare/types';
import { api, setSessionExpiredHandler } from '@/lib/api-client';

type AuthStatus = 'authenticated' | 'anonymous';

interface AuthContextValue {
  user: SessionUser | null;
  status: AuthStatus;
  login: (email: string, password: string) => Promise<SessionUser>;
  logout: () => Promise<void>;
  setUser: (user: SessionUser) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children, initialUser = null }: { children: React.ReactNode; initialUser?: SessionUser | null }) {
  const [user, setUserState] = useState<SessionUser | null>(initialUser);
  const [status, setStatus] = useState<AuthStatus>(initialUser ? 'authenticated' : 'anonymous');

  const clearSession = useCallback(() => {
    setUserState(null);
    setStatus('anonymous');
  }, []);

  const setUser = useCallback((next: SessionUser) => {
    setUserState(next);
    setStatus('authenticated');
  }, []);

  useEffect(() => {
    setSessionExpiredHandler(clearSession);
    return () => setSessionExpiredHandler(null);
  }, [clearSession]);

  const login = useCallback(async (email: string, password: string): Promise<SessionUser> => {
    const result = await api<{ user: SessionUser }>('/auth/login', { method: 'POST', body: { email, password } });
    setUser(result.user);
    return result.user;
  }, [setUser]);

  const logout = useCallback(async () => {
    await api('/auth/logout', { method: 'POST' }).catch(() => undefined);
    clearSession();
  }, [clearSession]);

  const value = useMemo(() => ({ user, status, login, logout, setUser }), [user, status, login, logout, setUser]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}

export function useCurrentUser(): SessionUser {
  const { user } = useAuth();
  if (!user) throw new Error('No authenticated user');
  return user;
}
