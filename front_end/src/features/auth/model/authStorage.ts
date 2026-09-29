import type { AuthSession } from './types';

const STORAGE_KEY = 'piiguard_auth_session';
const LEGACY_TOKEN_KEY = 'auth_token';

function isAuthSession(value: unknown): value is AuthSession {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Partial<AuthSession>;
  return (
    typeof candidate.token === 'string' &&
    candidate.token.length > 0 &&
    typeof candidate.user?.username === 'string' &&
    candidate.user.username.length > 0 &&
    (candidate.user.role === 'DPO' || candidate.user.role === 'Analyst')
  );
}

export function getStoredSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    return isAuthSession(parsed) ? parsed : null;
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
