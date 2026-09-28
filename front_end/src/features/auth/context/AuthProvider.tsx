import {
  useCallback,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import { loginWithApi } from '../api/authApi';
import { clearStoredSession, getStoredSession, saveStoredSession } from '../model/authStorage';
import type { AuthSession, LoginCredentials } from '../model/types';
import { AuthContext, type AuthContextValue } from './authContextDef';

export function AuthProvider({ children }: PropsWithChildren): JSX.Element {
  const [session, setSession] = useState<AuthSession | null>(() => getStoredSession());
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
    setError(null);
    clearStoredSession();
  }, []);

  const clearError = useCallback((): void => {
    setError(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      isAuthenticated: Boolean(session?.token),
      isLoading,
      error,
      login,
      logout,
      clearError,
    }),
    [session, isLoading, error, login, logout, clearError],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
