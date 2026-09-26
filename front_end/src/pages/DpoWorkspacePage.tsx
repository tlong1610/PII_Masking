import { DpoReviewExperience } from '@/features/piiReview';
import { AppShell } from '@/shared/ui';

export function DpoWorkspacePage(): JSX.Element {
  return (
    <AppShell activeRole="DPO">
      <DpoReviewExperience />
    </AppShell>
  );
}
