export type DemoAccount = {
  role: 'DPO' | 'Analyst';
  username: string;
  password: string;
  title: string;
  description: string;
};

/** Seeded demo users. Never shown on a production build unless explicitly enabled. */
export const DEMO_ACCOUNTS: readonly DemoAccount[] = [
  {
    role: 'DPO',
    username: 'dpo',
    password: 'dpo123',
    title: 'DPO / Người duyệt dữ liệu',
    description: 'Quét nguồn dữ liệu, review phân loại PII, tạo snapshot, phê duyệt phát hành.',
  },
  {
    role: 'Analyst',
    username: 'analyst',
    password: 'analyst123',
    title: 'Chuyên viên phân tích (Analyst)',
    description: 'Chỉ đọc snapshot đã phát hành (PUBLISHED), truy vấn tác vụ đã được duyệt.',
  },
];

type DemoLoginEnv = { MODE: string; VITE_ENABLE_DEMO_LOGIN?: string };

/**
 * Demo account shortcuts: on for `vite` dev and tests, off in any `vite build` unless VITE_ENABLE_DEMO_LOGIN=true.
 * Keyed on MODE, not DEV: a stray NODE_ENV=development (e.g. in .env.local) turns DEV on even in a build.
 */
export function isDemoLoginEnabled(env: DemoLoginEnv): boolean {
  return env.MODE !== 'production' || env.VITE_ENABLE_DEMO_LOGIN === 'true';
}
