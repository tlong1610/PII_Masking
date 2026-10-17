import { SCAN_TABLES, expect, leakedColumns, login, runIdFromUrl, selectTables, test } from './helpers';

// Scenario: scenarios/01-dpo-main-flow.md. One run goes scan -> review -> build -> verify -> publish.
test.describe.configure({ mode: 'serial' });

let runId = 0;

test.describe('DPO main flow', () => {
  test('TC-DPO-01 DPO signs in and lands on the scan workspace', async ({ page, problems: _ }) => {
    await login(page, 'dpo');
    await expect(page.getByRole('heading', { name: 'Lượt quét mới' })).toBeVisible();
    await expect(page.getByText('Không trả về giá trị PII gốc')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Nguồn dữ liệu: SQL demo' })).toBeVisible();
  });

  test('TC-DPO-02/03 DPO picks a scope and scans it', async ({ page, problems: _ }) => {
    await login(page, 'dpo');
    await selectTables(page, SCAN_TABLES);
    await expect(page.getByText(`Đã chọn ${SCAN_TABLES.length}/`)).toBeVisible();
    await page.getByRole('button', { name: 'Bắt đầu quét' }).click();
    await page.waitForURL(/\/dpo\/runs\/\d+/, { timeout: 180_000 });
    runId = runIdFromUrl(page.url());
    await expect(page.getByRole('heading', { name: `Lượt quét #${runId}` })).toBeVisible();
    await expect(page.getByText('Chờ duyệt').first()).toBeVisible();
    // AI fallback text means the LLM leg is misconfigured (ENV-01); the demo must not show it.
    await expect(page.getByText(/LLM unavailable/)).toHaveCount(0);
  });

  test('TC-DPO-04 KPI "PII columns" counts PII columns, not every column', async ({ page, problems: _ }) => {
    await login(page, 'dpo');
    await page.goto(`/dpo/runs/${runId}`);
    const card = page
      .getByRole('heading', { name: 'Cột PII phát hiện' })
      .locator('xpath=ancestor::*[contains(@class, "MuiPaper-root")][1]');
    await expect(card).toBeVisible();
    const text = (await card.innerText()).replace(/\s+/g, ' ');
    const number = (pattern: RegExp): number => {
      const match = pattern.exec(text);
      if (!match) throw new Error(`"${pattern.source}" not found in KPI card: ${text}`);
      return Number(match[1]);
    };
    const headline = number(/Cột PII phát hiện (\d+)/);
    const levels = number(/L3 nhạy cảm (\d+)/) + number(/L2 cơ bản (\d+)/) + number(/L1 gián tiếp (\d+)/);
    expect(levels).toBeGreaterThan(0);
    expect(headline).toBe(levels);
  });

  test('TC-DPO-05 review screen never shows raw PII', async ({ page, problems: _ }) => {
    await login(page, 'dpo');
    await page.goto(`/dpo/runs/${runId}`);
    await expect(page.getByRole('button', { name: 'contact_name', exact: true })).toBeVisible();
    expect(leakedColumns(await page.locator('body').innerText())).toEqual([]);
  });

  test('TC-DPO-06 overriding a recommendation requires a reason', async ({ page, problems: _ }) => {
    await login(page, 'dpo');
    await page.goto(`/dpo/runs/${runId}`);
    await page.getByRole('button', { name: 'ship_city', exact: true }).click();
    const drawer = page.locator('.MuiDrawer-paper');
    await expect(drawer.getByRole('heading', { name: 'ship_city' })).toBeVisible();
    await drawer.getByRole('combobox', { name: 'Hành động cho ship_city' }).click();
    await page.getByRole('option', { name: /^Che dữ liệu/ }).click();
    await drawer.getByRole('button', { name: 'Lưu & áp dụng thay đổi' }).click();
    await expect(drawer.getByText('Bắt buộc ghi lý do cho quyết định này.')).toBeVisible();
    await drawer.getByRole('textbox').fill('Thành phố giao hàng kết hợp ngày đặt có thể suy ra cá nhân.');
    await drawer.getByRole('button', { name: 'Lưu & áp dụng thay đổi' }).click();
    await expect(drawer).toBeHidden();
    await expect(page.getByRole('combobox', { name: 'Hành động cho ship_city' })).toHaveText(/Che dữ liệu/);
  });

  test('TC-DPO-07 sensitive (L3) data cannot be kept raw', async ({ page, problems: _ }) => {
    await login(page, 'dpo');
    await page.goto(`/dpo/runs/${runId}`);
    await page.getByRole('button', { name: 'ocr_text', exact: true }).click();
    const drawer = page.locator('.MuiDrawer-paper');
    await drawer.getByRole('combobox', { name: 'Hành động cho ocr_text' }).click();
    const keep = page.getByRole('option', { name: /^Giữ nguyên/ });
    await expect(keep).toBeDisabled();
    await expect(keep).toContainText('Cấm với L3');
    await page.keyboard.press('Escape');
    await drawer.getByRole('button', { name: 'Đóng' }).click();
    await expect(drawer).toBeHidden();
  });

  test('TC-DPO-08 saving builds a protected snapshot that passes verification', async ({ page, problems: _ }) => {
    await login(page, 'dpo');
    await page.goto(`/dpo/runs/${runId}`);
    // The override from TC-DPO-06 lived in page state only; apply it again before saving.
    await page.getByRole('combobox', { name: 'Hành động cho ship_city' }).click();
    await page.getByRole('option', { name: /^Che dữ liệu/ }).click();
    await page.getByRole('button', { name: 'Lưu', exact: true }).click();
    await expect(page.getByText('Chờ phát hành').first()).toBeVisible({ timeout: 180_000 });
    await expect(page.getByText(/Build blocked/)).toHaveCount(0);
    await page.getByRole('tab', { name: 'Dữ liệu cho Analyst' }).click();
    await expect(page.getByText('Đã qua kiểm định')).toBeVisible();
    const checks = page.getByRole('table', { name: 'Kết quả kiểm định downstream' }).getByRole('row');
    await expect(checks).not.toHaveCount(1);
    for (const name of ['policy_complete', 'sql_join_hmac', 'zero_raw_pii_egress']) {
      await expect(checks.filter({ hasText: name })).toContainText('Đạt');
    }
    await expect(checks.filter({ hasText: 'Không đạt' })).toHaveCount(0);
    expect(leakedColumns(await page.locator('main').innerText())).toEqual([]);
  });

  test('TC-DPO-09 compliance report opens without putting the session token in the URL', async ({ page, problems: _ }) => {
    await login(page, 'dpo');
    await page.goto(`/dpo/runs/${runId}`);
    const [report] = await Promise.all([
      page.waitForEvent('popup'),
      page.getByRole('button', { name: 'Báo cáo tuân thủ' }).click(),
    ]);
    expect(report.url()).not.toMatch(/[?&]token=/);
    await expect(report.getByText('BÁO CÁO TUÂN THỦ BẢO VỆ DỮ LIỆU CÁ NHÂN')).toBeVisible();
    expect(leakedColumns(await report.locator('body').innerText())).toEqual([]);
  });

  test('TC-DPO-10 DPO publishes and the audit log records it', async ({ page, problems: _ }) => {
    await login(page, 'dpo');
    await page.goto(`/dpo/runs/${runId}`);
    await page.getByRole('button', { name: 'Phát hành', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Phát hành' }).click();
    await expect(page.getByText('Đã phát hành').first()).toBeVisible();
    await page.getByRole('link', { name: 'Nhật ký hoạt động' }).click();
    await expect(page.getByText('Nhật ký nguyên vẹn')).toBeVisible();
    for (const action of ['Quét PII', 'Lưu quyết định', 'Tạo dữ liệu cho Analyst', 'Phát hành']) {
      await expect(page.getByRole('cell', { name: action, exact: true }).first()).toBeVisible();
    }
  });
});
