import { createContext } from 'react';
import type { AuthSession, AuthUser, LoginCredentials } from '../model/types';

export interface AuthContextValue {
  session: AuthSession | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  isSessionReady: boolean;
  isLoading: boolean;
  error: string | null;
  login: (credentials: LoginCredentials) => Promise<AuthSession>;
  logout: () => void;
  clearError: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
