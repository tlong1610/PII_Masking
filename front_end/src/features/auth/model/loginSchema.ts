import { z } from 'zod';

export const loginSchema = z.object({
  role: z.enum(['DPO', 'Analyst']),
  account: z.string().min(1, 'Chọn tài khoản demo'),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
