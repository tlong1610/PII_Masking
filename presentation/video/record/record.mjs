// Record the app scenes (S4–S10) with Playwright for the HyperFrames composition.
//
// Needs the app running with a fresh metadata DB (see presentation/video/README.md):
//   APP_URL (default http://localhost:5174), backend with ENABLE_PG_SNAPSHOT=true, DEMO_SOURCE_URL.
// One short clip per session (connect, scope, review, audit, analyst) so long waits (the remote
// scan) cannot drift the marks. Sessions run in order and depend on each other's server state.
// Output: assets/clips/<session>.webm and assets/clips/marks.json (seconds from each clip's start).
import { chromium } from 'playwright';
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CLIPS = join(ROOT, 'assets', 'clips');
const APP = process.env.APP_URL || 'http://localhost:5174';
// Connection string for the "connect a database" scene. Read from the environment only:
// never commit it. The form masks it as a password field on screen.
const SOURCE_URL = process.env.DEMO_SOURCE_URL;
const SOURCE_NAME = 'Supabase · CSDL bán hàng';
// The demo database's public schema also holds the app's own tables; leave them out of the scan.
const INTERNAL_TABLES = [
  'audit_events', 'checkpoint_blobs', 'checkpoint_migrations', 'checkpoint_writes', 'checkpoints',
  'data_sources', 'dataset_grants', 'datasets', 'demo_users', 'field_decision_history',
  'field_decisions', 'field_profiles', 'runs', 'vault_tokens', 'verifier_results',
];
const DATASET_NAME = 'Bán hàng · đã bảo vệ';
const VIEW = { width: 1536, height: 864 };
const MARKS = join(CLIPS, 'marks.json');
// `node record/record.mjs analyst` re-records one session and keeps the others' marks.
const only = process.argv.slice(2);
const marks = only.length && existsSync(MARKS) ? JSON.parse(readFileSync(MARKS, 'utf8')) : {};

async function session(name, scenario) {
  if (only.length && !only.includes(name)) return;
  const tmp = join(CLIPS, `_tmp_${name}`);
  rmSync(tmp, { recursive: true, force: true });
  const browser = await chromium.launch({ channel: 'chrome' });
  const ctx = await browser.newContext({
    viewport: VIEW,
    deviceScaleFactor: 1.25,
    // The screencast is captured at CSS-pixel size; the composition scales it to 1920x1080.
    recordVideo: { dir: tmp, size: VIEW },
  });
  await ctx.addInitScript({ path: join(ROOT, 'record', 'cursor.js') });
  const t0 = Date.now();
  const page = await ctx.newPage();
  const m = (label) => {
    marks[`${name}.${label}`] = Math.round((Date.now() - t0) / 10) / 100;
    console.log(name, label, marks[`${name}.${label}`]);
  };
  page.setDefaultTimeout(45000);
  const h = helpers(page, m);
  try {
    await scenario(page, h);
  } catch (err) {
    await page.screenshot({ path: join(CLIPS, `_fail_${name}.png`) });
    throw err;
  } finally {
    await ctx.close();
    await browser.close();
  }
  const file = readdirSync(tmp).find((f) => f.endsWith('.webm'));
  renameSync(join(tmp, file), join(CLIPS, `${name}.webm`));
  rmSync(tmp, { recursive: true, force: true });
}

function helpers(page, mark) {
  const pause = (ms) => page.waitForTimeout(ms);
  const moveTo = async (locator, { dx = 0, dy = 0, steps = 28 } = {}) => {
    await locator.scrollIntoViewIfNeeded();
    const b = await locator.boundingBox();
    await page.mouse.move(b.x + b.width / 2 + dx, b.y + b.height / 2 + dy, { steps });
    return b;
  };
  const click = async (locator, opts = {}) => {
    await moveTo(locator, opts);
    await pause(opts.hover ?? 280);
    await page.mouse.down();
    await pause(70);
    await page.mouse.up();
    await pause(opts.after ?? 600);
  };
  const scroll = async (dy, { steps = 14, delay = 28 } = {}) => {
    for (let i = 0; i < steps; i++) {
      await page.mouse.wheel(0, dy / steps);
      await pause(delay);
    }
  };
  const type = async (locator, text, delay = 55) => {
    await click(locator, { after: 150 });
    await page.keyboard.type(text, { delay });
  };
  const login = async (user, pass, delay = 55) => {
    await page.goto(`${APP}/login`);
    await page.getByPlaceholder('Nhập tên tài khoản').waitFor();
    await page.mouse.move(VIEW.width * 0.62, VIEW.height * 0.7);
    await pause(700);
    mark('login');
    await type(page.getByPlaceholder('Nhập tên tài khoản'), user, delay);
    await type(page.getByPlaceholder('Nhập mật khẩu'), pass, delay);
    await click(page.getByRole('button', { name: 'Đăng nhập', exact: true }), { after: 300 });
  };
  return { pause, moveTo, click, scroll, type, login, mark };
}

// Log in quickly as the DPO (footage before a session's first mark is never used).
async function dpoHome(page, h) {
  await h.login('dpo', 'dpo123', 15);
  await page.getByText('Lượt quét mới').first().waitFor();
}

mkdirSync(CLIPS, { recursive: true });
if (!SOURCE_URL && (!only.length || only.includes('connect'))) {
  throw new Error('Set DEMO_SOURCE_URL to the Postgres connection string to record');
}

await session('connect', async (page, h) => {
  // S4 — connect a real database
  // A fresh install has no sources: the empty state offers "Thêm cơ sở dữ liệu".
  await h.login('dpo', 'dpo123');
  const addSource = page.getByRole('button', { name: 'Thêm cơ sở dữ liệu' });
  await addSource.waitFor();
  await h.pause(900);
  h.mark('connect');
  await h.click(addSource, { after: 900 });
  h.mark('form');
  await h.type(page.getByLabel('Tên nguồn dữ liệu'), SOURCE_NAME, 40);
  h.mark('url');
  await h.type(page.getByLabel('URL kết nối'), SOURCE_URL, 10);
  await h.pause(600);
  h.mark('test');
  await h.click(page.getByRole('button', { name: 'Kiểm tra kết nối' }), { after: 200 });
  await page
    .locator('.MuiDialog-root .MuiAlert-colorSuccess, .MuiDialog-root .MuiAlert-standardSuccess')
    .last()
    .waitFor({ timeout: 60000 });
  h.mark('tested');
  await h.pause(1200);
  // After a successful test the schema field becomes a list of the source's schemas.
  await h.click(page.getByRole('combobox', { name: /Schema/ }), { after: 700 });
  await h.click(page.getByRole('option', { name: 'public', exact: true }), { after: 900 });
  h.mark('schema');
  await h.click(page.getByRole('button', { name: 'Lưu & kết nối' }), { after: 300 });
  h.mark('saved');
  await page.getByText('employee_territories', { exact: true }).first().waitFor({ timeout: 180000 });
  await h.pause(1500);
  h.mark('end');
});

await session('scope', async (page, h) => {
  // S5 — scope, link table, start scan (S6 uses the first seconds of the scan)
  await dpoHome(page, h);
  if (!(await page.getByRole('button', { name: SOURCE_NAME }).count())) {
    await page.getByRole('button', { name: 'Chọn nguồn dữ liệu' }).click();
    await page.getByText(SOURCE_NAME).last().click();
  }
  await page.getByText('employee_territories', { exact: true }).first().waitFor({ timeout: 180000 });
  for (const t of INTERNAL_TABLES) {
    const item = page.getByText(t, { exact: true }).first();
    if (await item.count()) await item.click();
  }
  await page.evaluate(() => document.querySelectorAll('*').forEach((el) => el.scrollTop && (el.scrollTop = 0)));
  await page.mouse.move(VIEW.width * 0.5, VIEW.height * 0.12);
  await h.pause(1500);
  h.mark('scope');
  await h.moveTo(page.getByRole('button', { name: SOURCE_NAME }));
  await h.pause(1600);
  h.mark('diagram');
  await h.moveTo(page.locator('.react-flow'), { dy: -40 });
  await h.pause(3200);
  h.mark('uncheck');
  await h.click(page.getByText('employee_territories', { exact: true }).first(), { after: 900 });
  h.mark('warning');
  await h.moveTo(page.getByText(/Mất liên kết N–N/).first());
  await h.pause(2200);
  await h.click(page.getByRole('button', { name: 'Thêm dạng bảng liên kết' }).first(), { after: 1200 });
  h.mark('start_scan');
  await h.click(page.getByRole('button', { name: 'Bắt đầu quét' }), { after: 200 });
  h.mark('scanning');
  await page.getByRole('tab', { name: /Tổng quan/ }).waitFor({ timeout: 900000 });
  await h.pause(1000);
  h.mark('end');
});

await session('review', async (page, h) => {
  // S7 — review; S8 — save (name the dataset), build, verify, publish
  await dpoHome(page, h);
  await page.goto(`${APP}/dpo/runs/1`);
  await page.getByRole('tab', { name: /Tổng quan/ }).waitFor();
  await page.mouse.move(VIEW.width * 0.5, VIEW.height * 0.12);
  await h.pause(1500);
  h.mark('review');
  await h.moveTo(page.getByText('Điểm rủi ro').first());
  await h.pause(1400);
  await h.moveTo(page.getByText('Cột PII phát hiện').first());
  await h.pause(1400);
  await h.moveTo(page.getByText('Phân loại cột & hành động').first());
  await h.pause(600);
  h.mark('scroll_columns');
  const email = page.getByText('email', { exact: true }).first();
  for (let i = 0; i < 12; i++) {
    const b = await email.boundingBox();
    if (b && b.y < VIEW.height * 0.55) break;
    await h.scroll(420);
    await h.pause(250);
  }
  await h.moveTo(email);
  await h.pause(1500);
  h.mark('inspector');
  await h.click(page.getByText('date_of_birth', { exact: true }).first(), { after: 1800 });
  await h.moveTo(page.getByText(/Căn cứ pháp lý/).first());
  await h.pause(2200);
  h.mark('override');
  await h.click(page.getByRole('combobox').last(), { after: 700 });
  await h.click(page.getByRole('option', { name: /Loại bỏ/ }), { after: 600 });
  await h.type(page.locator('textarea').first(), 'Analyst không cần ngày sinh cho báo cáo doanh số.', 32);
  await h.pause(500);
  await h.click(page.getByRole('button', { name: 'Lưu & áp dụng thay đổi' }), { after: 1200 });
  h.mark('risk_tab');
  await h.click(page.getByRole('tab', { name: 'Rủi ro & đánh giá' }), { after: 1500 });
  await h.moveTo(page.locator('main').first(), { dy: -60 });
  await h.pause(1200);
  await h.scroll(380);
  await h.pause(2200);

  h.mark('save');
  await h.click(page.getByRole('button', { name: 'Lưu', exact: true }), { after: 700 });
  const nameDialog = page.getByRole('dialog');
  if (await nameDialog.isVisible()) {
    h.mark('name');
    await h.click(nameDialog.getByLabel('Tên dataset'), { after: 150 });
    await page.keyboard.press('Control+A');
    await page.keyboard.type(DATASET_NAME, { delay: 45 });
    await h.pause(600);
    await h.click(nameDialog.getByRole('button', { name: 'Lưu', exact: true }), { after: 200 });
  }
  h.mark('building');
  await page.getByRole('button', { name: 'Phát hành' }).first().waitFor({ timeout: 300000 });
  h.mark('built');
  await h.pause(900);
  await h.click(page.getByRole('tab', { name: 'Dữ liệu cho Analyst' }), { after: 1400 });
  h.mark('verifier');
  const rows = page.locator('table').first().locator('tbody tr');
  const n = await rows.count();
  for (const i of [Math.min(1, n - 1), Math.max(0, n - 1)]) {
    await h.moveTo(rows.nth(i), { dx: -300 });
    await h.pause(1500);
  }
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
  await h.pause(600);
  h.mark('publish');
  await h.click(page.getByRole('button', { name: 'Phát hành' }).first(), { after: 1300 });
  await h.click(page.getByRole('dialog').getByRole('button', { name: 'Phát hành' }), { after: 2400 });
  h.mark('end');
});

await session('audit', async (page, h) => {
  // S9 — audit log
  await dpoHome(page, h);
  await page.mouse.move(VIEW.width * 0.5, VIEW.height * 0.3);
  await h.pause(800);
  h.mark('audit');
  const nav = page.getByRole('link', { name: 'Nhật ký hoạt động' }).or(page.getByRole('button', { name: 'Nhật ký hoạt động' }));
  await h.click(nav.first(), { after: 1800 });
  await h.moveTo(page.getByText('Nhật ký nguyên vẹn').first());
  await h.pause(1200);
  await h.click(page.getByRole('button', { name: 'Kiểm tra lại' }), { after: 1500 });
  h.mark('audit_row');
  await h.click(page.getByText(/Tạo dữ liệu cho Analyst — kiểm định đạt/).first(), { after: 1200 });
  const proof = page.getByText(/Bằng chứng chống sửa/).first();
  if (await proof.count()) await h.click(proof, { after: 2600 });
  else await h.pause(2000);
  h.mark('end');
});

await session('analyst', async (page, h) => {
  // S10 — analyst: preview, schema, download the protected dataset as CSV (ZIP)
  await h.login('analyst', 'analyst123');
  await page.getByText('Dataset đã phát hành').first().waitFor();
  await h.pause(1200);
  h.mark('workspace');
  await h.moveTo(page.getByText(DATASET_NAME).first());
  await h.pause(1000);
  h.mark('customers');
  await h.click(page.getByRole('button', { name: 'customers', exact: true }).first(), { after: 1600 });
  await h.moveTo(page.locator('table').first(), { dy: -60 });
  await h.pause(900);
  // Scroll the table's own container sideways to reveal masked contact fields and email.
  await page.evaluate(() => {
    let el = document.querySelector('table')?.parentElement;
    while (el && el.scrollWidth <= el.clientWidth + 4) el = el.parentElement;
    el?.scrollBy({ left: 1700, behavior: 'smooth' });
  });
  await h.pause(3000);
  h.mark('erd');
  const erdTab = page.getByRole('tab', { name: 'Quan hệ giữa các bảng' });
  await erdTab.evaluate((el) => el.scrollIntoView({ block: 'center', behavior: 'smooth' }));
  await h.pause(900);
  await h.click(erdTab, { after: 2600 });
  h.mark('csv');
  const zip = page.getByRole('button', { name: /Tải toàn bộ/ });
  await zip.evaluate((el) => el.scrollIntoView({ block: 'center', behavior: 'smooth' }));
  await h.pause(700);
  await h.moveTo(zip);
  await h.pause(1200);
  await h.click(zip, { after: 2400 });
  // Read-only SQL login tab: show host/user/sample query, but never issue a password on camera.
  h.mark('sql');
  await h.click(page.getByRole('tab', { name: 'Kết nối SQL' }), { after: 1500 });
  await h.moveTo(page.getByRole('table', { name: 'Thông tin kết nối SQL' }), { dx: -200 });
  await h.pause(1600);
  await h.moveTo(page.getByText(/^SELECT/).first());
  await h.pause(2200);
  h.mark('end');
});

writeFileSync(MARKS, JSON.stringify(marks, null, 2));
console.log('done');
