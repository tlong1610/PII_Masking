export type UserRole = 'DPO' | 'Analyst';

export interface AuthUser {
  id?: string;
  username: string;
  role: UserRole;
}

export interface AuthSession {
  user: AuthUser;
  token: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}
