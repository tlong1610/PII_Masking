import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import LinearProgress from '@mui/material/LinearProgress';
import { AppProviders } from '@/app/providers/AppProviders';
import { RequireRole } from '@/features/auth';

const DpoWorkspacePage = lazy(() =>
  import('@/pages/DpoWorkspacePage').then((module) => ({ default: module.DpoWorkspacePage })),
);
const LoginPage = lazy(() =>
  import('@/pages/LoginPage').then((module) => ({ default: module.LoginPage })),
);
const AnalystWorkspacePage = lazy(() =>
  import('@/pages/AnalystWorkspacePage').then((module) => ({
    default: module.AnalystWorkspacePage,
  })),
);

export function App(): JSX.Element {
  return (
    <AppProviders>
      <Suspense fallback={<LinearProgress aria-label="Đang tải giao diện" />}>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/dpo"
            element={
              <RequireRole role="DPO">
                <DpoWorkspacePage />
              </RequireRole>
            }
          />
          <Route
            path="/analyst"
            element={
              <RequireRole role="Analyst">
                <AnalystWorkspacePage />
              </RequireRole>
            }
          />
        </Routes>
      </Suspense>
    </AppProviders>
  );
}
