import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { expect, test as base, type Page } from '@playwright/test';

export const ROOT = path.resolve(import.meta.dirname, '../../..');
export const API = '/api/v1';

export const ACCOUNTS = {
  dpo: { username: 'dpo', password: 'dpo123' },
  analyst: { username: 'analyst', password: 'analyst123' },
} as const;

/** Tables the main flow scans: customers/orders carry most PII, kyc_documents has L3, tickets have free text. */
export const SCAN_TABLES = ['customers', 'orders', 'order_details', 'support_tickets', 'kyc_documents'];

type Problems = { console: string[]; api: string[] };

/**
 * Every test fails on browser console errors or 5xx API responses, so regressions surface even
 * when the visible assertion still passes. 4xx answers are part of guardrail tests and are allowed.
 */
export const test = base.extend<{ problems: Problems }>({
  problems: async ({ page }, use) => {
    const problems: Problems = { console: [], api: [] };
    page.on('console', (msg) => {
      if (msg.type() !== 'error') return;
      const text = msg.text();
      // Expected 4xx in guardrail tests are reported by the browser as resource errors.
      if (/status of 4\d\d/.test(text)) return;
      problems.console.push(text);
    });
    page.on('pageerror', (err) => problems.console.push(`pageerror: ${err.message}`));
    page.on('response', (res) => {
      if (res.url().includes(API) && res.status() >= 500) {
        problems.api.push(`${res.status()} ${res.request().method()} ${new URL(res.url()).pathname}`);
      }
    });
    await use(problems);
    expect(problems.console, 'browser console errors').toEqual([]);
    expect(problems.api, 'API 5xx responses').toEqual([]);
  },
});
export { expect };

export async function login(page: Page, role: keyof typeof ACCOUNTS): Promise<void> {
  const { username, password } = ACCOUNTS[role];
  await page.goto('/login');
  await page.getByRole('textbox', { name: 'Tài khoản' }).fill(username);
  await page.getByRole('textbox', { name: 'Mật khẩu' }).fill(password);
  // Wait for the post-login session check too, so later steps never race it (TC-SEC-02 covers that race).
  const sessionChecked = page.waitForResponse((res) => res.url().endsWith(`${API}/me`));
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await page.waitForURL(role === 'dpo' ? '**/dpo' : '**/analyst');
  await sessionChecked;
}

/** Bearer token straight from the API, for checks the UI cannot express (role guards on endpoints). */
export async function apiToken(page: Page, role: keyof typeof ACCOUNTS): Promise<string> {
  const res = await page.request.post(`${API}/sessions`, { data: ACCOUNTS[role] });
  expect(res.ok()).toBeTruthy();
  return (await res.json()).access_token as string;
}

let rawSamples: Record<string, string[]> | null = null;

/** Raw PII values from the source DB. Only ever compared against, never printed. */
export function rawPiiSamples(): Record<string, string[]> {
  if (!rawSamples) {
    const out = execFileSync(
      path.join(ROOT, '.venv/bin/python'),
      [path.join(ROOT, 'release/qa/scripts/sample_raw_pii.py')],
      { cwd: ROOT, env: { ...process.env, PYTHONPATH: ROOT }, encoding: 'utf8' },
    );
    rawSamples = JSON.parse(out) as Record<string, string[]>;
  }
  return rawSamples;
}

/** Names of source columns whose raw values occur in `text`; values themselves stay out of reports. */
export function leakedColumns(text: string): string[] {
  return Object.entries(rawPiiSamples())
    .filter(([, values]) => values.some((value) => text.includes(value)))
    .map(([column]) => column);
}

/** Row counts of source tables, to prove an export holds every row and not just a preview page. */
export function sourceRowCounts(tables: string[]): Record<string, number> {
  const out = execFileSync(
    path.join(ROOT, '.venv/bin/python'),
    [path.join(ROOT, 'release/qa/scripts/source_row_counts.py'), ...tables],
    { cwd: ROOT, env: { ...process.env, PYTHONPATH: ROOT }, encoding: 'utf8' },
  );
  return JSON.parse(out) as Record<string, number>;
}

/** Files of a downloaded ZIP (names → UTF-8 text, BOM stripped), read with the system unzip. */
export function readZip(file: string): Record<string, string> {
  const names = execFileSync('unzip', ['-Z1', file], { encoding: 'utf8' }).split('\n').filter(Boolean);
  return Object.fromEntries(
    names.map((name) => [
      name,
      execFileSync('unzip', ['-p', file, name], { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 }).replace(/^\uFEFF/, ''),
    ]),
  );
}

/** Splits CSV text into records of fields, honouring quoted fields that contain commas or newlines. */
export function parseCsv(text: string): string[][] {
  const records: string[][] = [];
  let record: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"';
        i += 1;
      } else if (ch === '"') {
        quoted = false;
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ',') {
      record.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i += 1;
      record.push(field);
      records.push(record);
      record = [];
      field = '';
    } else {
      field += ch;
    }
  }
  if (field || record.length) {
    record.push(field);
    records.push(record);
  }
  return records;
}

export function runIdFromUrl(url: string): number {
  const match = /\/dpo\/runs\/(\d+)/.exec(url);
  if (!match) throw new Error(`not a run URL: ${url}`);
  return Number(match[1]);
}

export async function selectTables(page: Page, tables: string[]): Promise<void> {
  // The counter button toggles all tables; start from an empty selection.
  const toggle = page.getByRole('button', { name: /^\d+\/\d+$/ });
  await expect(toggle).toBeVisible();
  const [selected] = ((await toggle.textContent()) ?? '0/0').split('/');
  if (Number(selected) > 0) await toggle.click();
  for (const table of tables) {
    await page.getByRole('checkbox', { name: new RegExp(`^${table} `) }).check();
  }
}
