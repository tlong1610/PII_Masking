import { defineConfig } from '@playwright/test';
import path from 'node:path';

// Isolated QA stack: backend :8010 with a fresh SQLite metadata DB, Vite :5174 proxying /api.
// Source + snapshot data come from the repo .env (local Docker Postgres/Mongo); snapshots use
// QA-only names so QA run ids never overwrite the developer's own snapshots.
const ROOT = path.resolve(import.meta.dirname, '../..');
const BACKEND_PORT = Number(process.env.QA_BACKEND_PORT ?? 8010);
const FRONTEND_PORT = Number(process.env.QA_FRONTEND_PORT ?? 5174);

export default defineConfig({
  testDir: './specs',
  // Specs share one stack and run in file order: DPO publishes, Analyst consumes, lifecycle revokes.
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 240_000,
  expect: { timeout: 20_000 },
  outputDir: './reports/artifacts',
  reporter: [
    ['list'],
    ['html', { outputFolder: './reports/html', open: 'never' }],
    ['json', { outputFile: './reports/last-run.json' }],
  ],
  use: {
    baseURL: `http://localhost:${FRONTEND_PORT}`,
    channel: 'chrome',
    viewport: { width: 1440, height: 900 },
    locale: 'vi-VN',
    timezoneId: 'Asia/Ho_Chi_Minh',
    // Fail fast on a missing element instead of burning the whole test timeout.
    actionTimeout: 20_000,
    navigationTimeout: 30_000,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: [
    {
      command:
        `rm -f data/qa_app.db && DATABASE_URL=sqlite:///./data/qa_app.db ` +
        `CORS_ORIGINS=http://localhost:${FRONTEND_PORT} SNAPSHOT_SCHEMA=piiguard_qa_snapshot ` +
        `MONGO_SNAPSHOT_DB=mydatabase_qa_protected OPENAI_MODEL=${process.env.QA_OPENAI_MODEL ?? 'gpt-4o-mini'} ` +
        `.venv/bin/uvicorn src.main:app --host 127.0.0.1 --port ${BACKEND_PORT}`,
      cwd: ROOT,
      url: `http://127.0.0.1:${BACKEND_PORT}/health`,
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      command: `npx vite --port ${FRONTEND_PORT} --strictPort`,
      cwd: path.join(ROOT, 'front_end'),
      env: { VITE_API_URL: '/api/v1', VITE_PROXY_TARGET: `http://127.0.0.1:${BACKEND_PORT}` },
      url: `http://localhost:${FRONTEND_PORT}/login`,
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
});
