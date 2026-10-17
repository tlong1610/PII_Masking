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

type DemoLoginEnv = { DEV: boolean; VITE_ENABLE_DEMO_LOGIN?: string };

/** Demo account shortcuts: on in development, off in a release build unless VITE_ENABLE_DEMO_LOGIN=true. */
export function isDemoLoginEnabled(env: DemoLoginEnv): boolean {
  return env.DEV || env.VITE_ENABLE_DEMO_LOGIN === 'true';
}
