import { describe, expect, it } from 'vitest';
import { loginSchema } from './loginSchema';

describe('loginSchema', () => {
  it('passes when both username and password are provided', () => {
    const result = loginSchema.safeParse({
      username: 'dpo',
      password: 'dpo123',
    });
    expect(result.success).toBe(true);
  });

  it('fails when username is empty', () => {
    const result = loginSchema.safeParse({
      username: '',
      password: 'dpo123',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('Vui lòng nhập tài khoản');
    }
  });

  it('fails when password is empty', () => {
    const result = loginSchema.safeParse({
      username: 'dpo',
      password: '',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('Vui lòng nhập mật khẩu');
    }
  });

  it('fails when username exceeds 64 characters', () => {
    const result = loginSchema.safeParse({
      username: 'a'.repeat(65),
      password: 'password123',
    });
    expect(result.success).toBe(false);
  });
});
