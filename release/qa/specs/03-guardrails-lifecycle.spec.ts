import { API, SCAN_TABLES, apiToken, expect, login, runIdFromUrl, selectTables, test } from './helpers';

// Scenario: scenarios/03-guardrails-lifecycle.md. Runs after the DPO flow has published a dataset.
test.describe.configure({ mode: 'serial' });

test.describe('Guardrails and lifecycle', () => {
  test('TC-SEC-01 wrong password is rejected with a clear message', async ({ page, problems: _ }) => {
    await page.goto('/login');
    await page.getByRole('textbox', { name: 'Tài khoản' }).fill('dpo');
    await page.getByRole('textbox', { name: 'Mật khẩu' }).fill('sai-mat-khau');
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
    await expect(page.getByText('Tài khoản hoặc mật khẩu không chính xác.')).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });

  test('TC-SEC-02 session survives opening a deep link right after sign-in', async ({ page, problems: _ }) => {
    await page.goto('/login');
    await page.getByRole('textbox', { name: 'Tài khoản' }).fill('dpo');
    await page.getByRole('textbox', { name: 'Mật khẩu' }).fill('dpo123');
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
    await page.waitForURL('**/dpo');
    // No wait for the session check: navigating while it is in flight must not sign the user out.
    await page.goto('/dpo/runs');
    await expect(page.getByRole('heading', { name: 'Lịch sử lượt quét' })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Lịch sử lượt quét' })).toBeVisible();
  });

  test('TC-SEC-03 API ignores tokens passed in the query string', async ({ page, problems: _ }) => {
    const token = await apiToken(page, 'dpo');
    const res = await page.request.get(`${API}/runs?token=${encodeURIComponent(token)}`);
    expect(res.status()).toBe(401);
  });

  test('TC-LC-01 a new run on the same source builds while the previous one is published', async ({ page, problems: _ }) => {
    await login(page, 'dpo');
    await selectTables(page, SCAN_TABLES.slice(0, 2));
    await page.getByRole('button', { name: 'Bắt đầu quét' }).click();
    await page.waitForURL(/\/dpo\/runs\/\d+/, { timeout: 180_000 });
    const runId = runIdFromUrl(page.url());
    await page.getByRole('button', { name: 'Lưu', exact: true }).click();
    await expect(page.getByText('Chờ phát hành').first()).toBeVisible({ timeout: 180_000 });
    await expect(page.getByText(/Build blocked|đang bị chiếm/)).toHaveCount(0);
    expect(runId).toBeGreaterThan(1);
  });

  test('TC-LC-02 revoking a dataset removes it from the Analyst workspace', async ({ page, problems: _ }) => {
    const token = await apiToken(page, 'dpo');
    const datasets = await (
      await page.request.get(`${API}/datasets`, { headers: { Authorization: `Bearer ${token}` } })
    ).json();
    const published = (datasets as { id: number; status: string; dataset_name: string }[]).find((d) => d.status === 'PUBLISHED');
    expect(published, 'a published dataset from the DPO flow').toBeTruthy();

    await login(page, 'dpo');
    await page.getByRole('link', { name: 'Lịch sử quét' }).click();
    await page.getByRole('tab', { name: /Đã phát hành/ }).click();
    await page.getByRole('button', { name: 'Thu hồi' }).first().click();
    await page.getByRole('dialog').getByRole('button', { name: 'Thu hồi' }).click();
    await expect(page.getByRole('tab', { name: 'Đã phát hành (0)' })).toBeVisible();

    await page.getByRole('button', { name: 'Đăng xuất' }).click();
    await login(page, 'analyst');
    await expect(page.getByText(published!.dataset_name, { exact: true })).toHaveCount(0);
  });
});
