import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth';
import { AnalystDatasetExperienceMVP } from '@/features/piiReview';
import { routes } from '@/shared/config/routes';
import { AppShell } from '@/shared/ui';

export function AnalystWorkspacePage(): JSX.Element {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = (): void => {
    logout();
    navigate(routes.login);
  };

  return (
    <AppShell activeRole="Analyst" currentUser={user} onLogout={handleLogout}>
      <AnalystDatasetExperienceMVP />
    </AppShell>
  );
}
