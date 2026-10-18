import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import Box from '@mui/material/Box';
import { AppProviders } from '@/app/providers/AppProviders';
import { RequireRole } from '@/features/auth';
import { MascotLoader } from '@/shared/ui';

const DpoLayout = lazy(() => import('@/pages/DpoLayout').then((module) => ({ default: module.DpoLayout })));
const DpoWorkspacePage = lazy(() =>
  import('@/pages/DpoWorkspacePage').then((module) => ({ default: module.DpoWorkspacePage })),
);
const DpoRunHistoryPage = lazy(() =>
  import('@/pages/DpoRunHistoryPage').then((module) => ({ default: module.DpoRunHistoryPage })),
);
const DpoDatasetDetailPage = lazy(() =>
  import('@/pages/DpoDatasetDetailPage').then((module) => ({ default: module.DpoDatasetDetailPage })),
);
const DpoAuditPage = lazy(() => import('@/pages/DpoAuditPage').then((module) => ({ default: module.DpoAuditPage })));
const DpoMaskingDemoPage = lazy(() =>
  import('@/pages/DpoMaskingDemoPage').then((module) => ({ default: module.DpoMaskingDemoPage })),
);
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
      <Suspense
        fallback={
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
            <MascotLoader title="Đang tải giao diện…" />
          </Box>
        }
      >
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
            {/* Datasets are managed from the run history now; old links keep working. */}
            <Route path="datasets" element={<Navigate to="/dpo/runs" replace />} />
            <Route path="datasets/:datasetId" element={<DpoDatasetDetailPage />} />
            <Route path="audit" element={<DpoAuditPage />} />
            <Route path="masking" element={<DpoMaskingDemoPage />} />
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
