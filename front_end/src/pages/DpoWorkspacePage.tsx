import { useNavigate, useParams } from 'react-router-dom';
import { DpoReviewExperienceMVP } from '@/features/piiReview';
import { routes } from '@/shared/config/routes';

export function DpoWorkspacePage(): JSX.Element {
  const { runId } = useParams();
  const navigate = useNavigate();
  const parsedRunId = runId !== undefined && /^\d+$/.test(runId) ? Number(runId) : null;

  return (
    <DpoReviewExperienceMVP
      initialRunId={parsedRunId}
      // Put the new run in the URL so a reload (or a shared link) reopens the same review.
      onRunCreated={(id) => navigate(routes.dpoRun(id))}
    />
  );
}
