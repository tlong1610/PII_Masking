import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import LinearProgress from '@mui/material/LinearProgress';
import { AppProviders } from '@/app/providers/AppProviders';
import { RequireRole } from '@/features/auth';

const DpoLayout = lazy(() => import('@/pages/DpoLayout').then((module) => ({ default: module.DpoLayout })));
const DpoWorkspacePage = lazy(() =>
  import('@/pages/DpoWorkspacePage').then((module) => ({ default: module.DpoWorkspacePage })),
);
const DpoRunHistoryPage = lazy(() =>
  import('@/pages/DpoRunHistoryPage').then((module) => ({ default: module.DpoRunHistoryPage })),
);
const DpoDatasetsPage = lazy(() =>
  import('@/pages/DpoDatasetsPage').then((module) => ({ default: module.DpoDatasetsPage })),
);
const DpoDatasetDetailPage = lazy(() =>
  import('@/pages/DpoDatasetDetailPage').then((module) => ({ default: module.DpoDatasetDetailPage })),
);
const DpoAuditPage = lazy(() => import('@/pages/DpoAuditPage').then((module) => ({ default: module.DpoAuditPage })));
const DpoRulesPage = lazy(() => import('@/pages/DpoRulesPage').then((module) => ({ default: module.DpoRulesPage })));
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
                <DpoLayout />
              </RequireRole>
            }
          >
            <Route index element={<DpoWorkspacePage />} />
            <Route path="runs" element={<DpoRunHistoryPage />} />
            <Route path="runs/:runId" element={<DpoWorkspacePage />} />
            <Route path="datasets" element={<DpoDatasetsPage />} />
            <Route path="datasets/:datasetId" element={<DpoDatasetDetailPage />} />
            <Route path="audit" element={<DpoAuditPage />} />
            <Route path="rules" element={<DpoRulesPage />} />
          </Route>
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
