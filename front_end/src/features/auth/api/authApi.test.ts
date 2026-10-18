import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchCurrentUser, loginWithApi } from './authApi';

describe('authApi', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('successfully logs in and normalizes server DTO', async () => {
    const mockResponse = {
      access_token: 'backend-token-123',
      token_type: 'bearer',
      username: 'dpo',
      role: 'DPO',
    };

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve(mockResponse),
    } as Response);

    const result = await loginWithApi({ username: 'dpo', password: 'dpo123' });

    expect(result).toEqual({
      token: 'backend-token-123',
      user: {
        username: 'dpo',
        role: 'DPO',
      },
    });
  });

  it('normalizes ANALYST role from server to Analyst', async () => {
    const mockResponse = {
      access_token: 'backend-token-analyst',
      token_type: 'bearer',
      username: 'analyst',
      role: 'ANALYST',
    };

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve(mockResponse),
    } as Response);

    const result = await loginWithApi({ username: 'analyst', password: 'analyst123' });

    expect(result.user.role).toBe('Analyst');
  });

  it('throws 401 error message when credentials are wrong', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ detail: 'Invalid username or password' }),
    } as Response);

    await expect(
      loginWithApi({ username: 'wrong', password: 'credentials' }),
    ).rejects.toThrow('Tài khoản hoặc mật khẩu không chính xác.');
  });

  it('falls back to demo account when network fetch fails for dpo', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new TypeError('Failed to fetch'));

    const result = await loginWithApi({ username: 'dpo', password: 'dpo123' });
    expect(result.user.username).toBe('dpo');
    expect(result.user.role).toBe('DPO');
  });

  it('returns null from fetchCurrentUser when the token is rejected', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      json: () => Promise.resolve({ detail: 'Invalid or expired session token' }),
    } as Response);

    await expect(fetchCurrentUser('expired-token')).resolves.toBeNull();
  });

  it('rethrows from fetchCurrentUser when the check itself fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new TypeError('Failed to fetch'));

    await expect(fetchCurrentUser('valid-token')).rejects.toThrow('Failed to fetch');
  });
});
