import { z } from 'zod';

const URL_SCHEME = /^(postgresql|postgres|mongodb(\+srv)?):\/\//i;

export const sourceFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Vui lòng nhập tên nguồn')
    .max(128, 'Tên không được vượt quá 128 ký tự'),
  url: z
    .string()
    .trim()
    .min(8, 'Vui lòng nhập connection URL')
    .max(2048, 'URL quá dài')
    .refine((value) => URL_SCHEME.test(value), 'URL phải bắt đầu bằng postgresql:// hoặc mongodb://'),
  namespace: z.string().trim().max(128, 'Tối đa 128 ký tự'),
  tables: z.string().trim().max(1000, 'Tối đa 1000 ký tự'),
});

export type SourceFormValues = z.infer<typeof sourceFormSchema>;

export function detectEngine(url: string): 'postgresql' | 'mongodb' | null {
  const value = url.trim().toLowerCase();
  if (value.startsWith('postgresql://') || value.startsWith('postgres://')) return 'postgresql';
  if (value.startsWith('mongodb://') || value.startsWith('mongodb+srv://')) return 'mongodb';
  return null;
}

export function parseTables(raw: string): string[] {
  return raw
    .split(',')
    .map((table) => table.trim())
    .filter(Boolean);
}

export function isUserSource(sourceId: string): boolean {
  return sourceId.startsWith('usr-');
}
