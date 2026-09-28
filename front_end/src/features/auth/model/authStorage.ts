import type { AuthSession } from './types';

const STORAGE_KEY = 'piiguard_auth_session';
const LEGACY_TOKEN_KEY = 'auth_token';

export function getStoredSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'token' in parsed &&
      'user' in parsed &&
      typeof (parsed as AuthSession).token === 'string' &&
      typeof (parsed as AuthSession).user?.username === 'string'
    ) {
      return parsed as AuthSession;
    }
    return null;
  } catch {
    return null;
  }
}

export function saveStoredSession(session: AuthSession): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    sessionStorage.setItem(LEGACY_TOKEN_KEY, session.token);
  } catch {
    // Ignore storage quota/permission errors in edge environments
  }
}

export function clearStoredSession(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(LEGACY_TOKEN_KEY);
  } catch {
    // Ignore storage errors
  }
}
