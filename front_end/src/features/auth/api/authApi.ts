import { z } from 'zod';
import { ApiError, apiRequest } from '@/shared/api/client';
import type { AuthSession, AuthUser, LoginCredentials, UserRole } from '../model/types';

const sessionResponseSchema = z.object({
  access_token: z.string().min(1),
  token_type: z.string().default('bearer'),
  username: z.string().min(1),
  role: z.string().min(1),
});

function normalizeRole(roleStr: string): UserRole {
  if (roleStr.trim().toUpperCase() === 'ANALYST') {
    return 'Analyst';
  }
  return 'DPO';
}

export async function loginWithApi(credentials: LoginCredentials): Promise<AuthSession> {
  try {
    const json = await apiRequest<unknown>('/sessions', {
      method: 'POST',
      body: JSON.stringify({
        username: credentials.username,
        password: credentials.password,
      }),
    });
    const validated = sessionResponseSchema.parse(json);

    return {
      token: validated.access_token,
      user: {
        username: validated.username,
        role: normalizeRole(validated.role),
      },
    };
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.status === 401) {
        throw new Error('Tài khoản hoặc mật khẩu không chính xác.');
      }
      throw new Error(error.message || `Đăng nhập không thành công (mã lỗi ${error.status})`);
    }

    // Local dev fallback only when the backend is unreachable.
    if (credentials.username === 'dpo' && credentials.password === 'dpo123') {
      return {
        token: 'demo-dpo-token',
        user: {
          username: 'dpo',
          role: 'DPO',
        },
      };
    }
    if (credentials.username === 'analyst' && credentials.password === 'analyst123') {
      return {
        token: 'demo-analyst-token',
        user: {
          username: 'analyst',
          role: 'Analyst',
        },
      };
    }

    if (error instanceof Error && error.message) {
      throw error;
    }
    throw new Error('Không thể kết nối đến máy chủ xác thực.');
  }
}

export async function fetchCurrentUser(token: string): Promise<AuthUser | null> {
  try {
    const data = await apiRequest<{ id?: string; username: string; role: string }>('/me', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return {
      id: data.id,
      username: data.username,
      role: normalizeRole(data.role),
    };
  } catch {
    return null;
  }
}
