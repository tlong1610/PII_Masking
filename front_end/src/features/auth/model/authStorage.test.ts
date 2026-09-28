import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { clearStoredSession, getStoredSession, saveStoredSession } from './authStorage';
import type { AuthSession } from './types';

describe('authStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('returns null when no session is stored', () => {
    expect(getStoredSession()).toBeNull();
  });

  it('saves and restores an auth session', () => {
    const session: AuthSession = {
      token: 'jwt-test-token',
      user: {
        username: 'dpo',
        role: 'DPO',
      },
    };

    saveStoredSession(session);
    const restored = getStoredSession();

    expect(restored).toEqual(session);
  });

  it('clears stored session', () => {
    const session: AuthSession = {
      token: 'jwt-test-token',
      user: {
        username: 'analyst',
        role: 'Analyst',
      },
    };

    saveStoredSession(session);
    expect(getStoredSession()).not.toBeNull();

    clearStoredSession();
    expect(getStoredSession()).toBeNull();
  });

  it('handles invalid JSON gracefully', () => {
    localStorage.setItem('piiguard_auth_session', 'not-valid-json');
    expect(getStoredSession()).toBeNull();
  });
});
