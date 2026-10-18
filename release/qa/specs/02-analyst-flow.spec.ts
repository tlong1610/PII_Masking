import { readFile } from 'node:fs/promises';
import {
  API,
  apiToken,
  expect,
  leakedColumns,
  login,
  parseCsv,
  readZip,
  SCAN_TABLES,
  sourceRowCounts,
  test,
} from './helpers';

// Scenario: scenarios/02-analyst-flow.md. Consumes the dataset published by 01-dpo-main-flow.
test.describe('Analyst flow', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'analyst');
  });

  test('TC-AN-01 Analyst sees the published dataset', async ({ page, problems: _ }) => {
    await expect(page.getByRole('heading', { name: 'Dataset đã phát hành' })).toBeVisible();
    await expect(page.getByText(/^run-\d+-snapshot$/).first()).toBeVisible();
    await expect(page.getByText(/Kiểm định đạt \d+\/\d+/)).toBeVisible();
  });

  test('TC-AN-02 every table preview is protected and sensitive columns are dropped', async ({ page, problems: _ }) => {
    for (const table of ['customers', 'orders', 'order_details', 'support_tickets', 'kyc_documents']) {
      await page.getByRole('button', { name: table, exact: true }).click();
      const grid = page.getByRole('table');
      await expect(grid.getByRole('row').nth(1)).toBeVisible();
      expect(leakedColumns(await page.locator('main').innerText()), `raw PII in ${table}`).toEqual([]);
      if (table === 'kyc_documents') {
        const headers = (await grid.getByRole('columnheader').allInnerTexts()).join(' ');
        expect(headers).not.toContain('ocr_text');
        expect(headers).not.toContain('file_path');
      }
    }
  });

  test('TC-AN-03 full export: every table, every row, protected', async ({ page, problems: _ }) => {
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: /Tải toàn bộ/ }).click(),
    ]);
    expect(download.suggestedFilename()).toMatch(/\.zip$/);
    const files = readZip(await download.path());
    expect(Object.keys(files).sort()).toEqual(SCAN_TABLES.map((t) => `${t}.csv`).sort());
    const expectedRows = sourceRowCounts(SCAN_TABLES);
    for (const table of SCAN_TABLES) {
      const [header, ...rows] = parseCsv(files[`${table}.csv`]);
      expect(new Set(header).size, `duplicate columns in ${table}`).toBe(header.length);
      expect(rows.length, `rows of ${table}`).toBe(expectedRows[table]);
      expect(leakedColumns(files[`${table}.csv`]), `raw PII in ${table}`).toEqual([]);
    }
    expect(parseCsv(files['customers.csv'])[0], 'columns from other tables').not.toContain('ship_name');
    expect(parseCsv(files['kyc_documents.csv'])[0]).not.toContain('ocr_text');
  });

  test('TC-AN-03b single-table CSV holds that table only, every row', async ({ page, problems: _ }) => {
    await page.getByRole('button', { name: 'customers', exact: true }).click();
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: /Tải CSV bảng customers/ }).click(),
    ]);
    const csv = (await readFile(await download.path())).toString('utf8').replace(/^\uFEFF/, '');
    const [header, ...rows] = parseCsv(csv);
    expect(header).toContain('contact_name');
    expect(header, 'columns from other tables').not.toContain('ship_name');
    expect(rows.length).toBe(sourceRowCounts(['customers']).customers);
    expect(leakedColumns(csv)).toEqual([]);
  });

  test('TC-AN-04 dataset header actions stay inside the card', async ({ page, problems: _ }) => {
    const viewport = page.viewportSize();
    for (const name of [/Tải toàn bộ/, /Tải CSV/]) {
      const button = page.getByRole('button', { name });
      await expect(button).toBeVisible();
      const box = await button.boundingBox();
      expect(box && viewport && box.x + box.width <= viewport.width - 16).toBeTruthy();
      // A clipped label wraps onto several lines; a healthy button is a single line.
      expect(box && box.height < 48).toBeTruthy();
    }
  });

  test('TC-AN-05 column guide explains every transform truthfully', async ({ page, problems: _ }) => {
    await page.getByRole('tab', { name: 'Các cột & cách dùng' }).click();
    await expect(page.getByText('Băm HMAC').first()).toBeVisible();
    // MASK replaces the whole value with ***, so the guide must not promise a partial mask.
    await expect(page.getByText(/Đã che một phần/)).toHaveCount(0);
  });

  test('TC-AN-06 relationship diagram renders the snapshot tables', async ({ page, problems: _ }) => {
    await page.getByRole('tab', { name: 'Quan hệ giữa các bảng' }).click();
    for (const table of ['customers', 'orders']) {
      await expect(page.getByText(`public.${table}`, { exact: true })).toBeVisible();
    }
  });

  test('TC-AN-07 Analyst cannot open DPO screens or DPO APIs', async ({ page, problems: _ }) => {
    await page.goto('/dpo');
    await expect(page.getByRole('heading', { name: 'Không có quyền truy cập' })).toBeVisible();
    const token = await apiToken(page, 'analyst');
    for (const path of ['/runs', '/sources', '/audit']) {
      const res = await page.request.get(`${API}${path}`, { headers: { Authorization: `Bearer ${token}` } });
      expect(res.status(), path).toBe(403);
    }
  });
});
