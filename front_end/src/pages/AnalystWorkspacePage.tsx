import { AnalystDatasetExperience } from '@/features/piiReview';
import { AppShell } from '@/shared/ui';

export function AnalystWorkspacePage(): JSX.Element {
  return (
    <AppShell activeRole="Analyst">
      <AnalystDatasetExperience />
    </AppShell>
  );
}
