import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import { UNAUTHORIZED_EVENT } from '@/shared/api/client';
import { fetchCurrentUser, loginWithApi } from '../api/authApi';
import { clearStoredSession, getStoredSession, saveStoredSession } from '../model/authStorage';
import type { AuthSession, LoginCredentials } from '../model/types';
import { AuthContext, type AuthContextValue } from './authContextDef';

export function AuthProvider({ children }: PropsWithChildren): JSX.Element {
  const [session, setSession] = useState<AuthSession | null>(() => getStoredSession());
  const [isSessionReady, setIsSessionReady] = useState<boolean>(() => !getStoredSession());
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const login = useCallback(async (credentials: LoginCredentials): Promise<AuthSession> => {
    setIsLoading(true);
    setError(null);
    try {
      const newSession = await loginWithApi(credentials);
      setSession(newSession);
      saveStoredSession(newSession);
      return newSession;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Đăng nhập không thành công.';
      setError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback((): void => {
    setSession(null);
    setIsSessionReady(true);
    setError(null);
    clearStoredSession();
  }, []);

  const clearError = useCallback((): void => {
    setError(null);
  }, []);

  useEffect(() => {
    if (!session?.token) {
      setIsSessionReady(true);
      return;
    }

    let active = true;
    setIsSessionReady(false);

    void fetchCurrentUser(session.token)
      .then((user) => {
        if (!active) return;
        if (!user) {
          logout();
          return;
        }
        const verifiedSession: AuthSession = {
          token: session.token,
          user,
        };
        setSession(verifiedSession);
        saveStoredSession(verifiedSession);
      })
      .catch(() => {
        // Session could not be checked (offline, aborted): keep it; a later 401 still signs out.
      })
      .finally(() => {
        if (active) {
          setIsSessionReady(true);
        }
      });

    return () => {
      active = false;
    };
  }, [logout, session?.token]);

  useEffect(() => {
    window.addEventListener(UNAUTHORIZED_EVENT, logout);
    return () => {
      window.removeEventListener(UNAUTHORIZED_EVENT, logout);
    };
  }, [logout]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      isAuthenticated: Boolean(session?.token),
      isSessionReady,
      isLoading,
      error,
      login,
      logout,
      clearError,
    }),
    [session, isSessionReady, isLoading, error, login, logout, clearError],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
