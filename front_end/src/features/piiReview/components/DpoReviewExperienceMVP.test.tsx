import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import type { Run, Source } from '../api/realPiiReviewApi';
import * as hooks from '../hooks/usePiiReview';
import { DpoReviewExperienceMVP } from './DpoReviewExperienceMVP';

const source = (id: string, name: string): Source => ({
  id,
  name,
  source_type: 'SQL',
  engine: 'postgresql',
  description: '',
  scope_summary: '',
  status: 'ok',
});

const run: Run = {
  id: 54,
  source_id: 'usr-db01',
  source_type: 'SQL',
  source_name: 'DB01',
  engine: 'postgresql',
  status: 'VERIFIED',
  created_by: 1,
  source_manifest_version: 'v1',
  policy_version: 'v1',
  field_profiles: [],
  field_decisions: [],
  datasets: [],
};

const mutation = { mutateAsync: vi.fn(), isPending: false };

vi.mock('../hooks/usePiiReview', () => ({
  // SQL demo comes first: before the fix it overwrote the run's own source.
  useDataSources: () => ({
    data: [source('sql-demo', 'SQL demo'), source('usr-db01', 'DB01')],
    isLoading: false,
    refetch: vi.fn(),
  }),
  useSourceScope: vi.fn(() => ({ data: undefined })),
  useRun: () => ({ data: run }),
  useRiskScore: () => ({ data: undefined }),
  useJoinKeys: () => ({ data: [] }),
  useCreateScanRun: () => mutation,
  useDeleteDataSource: () => mutation,
  useUpdateFieldDecisions: () => mutation,
  useBuildDataset: () => mutation,
  usePublishDataset: () => mutation,
  useRevokeDataset: () => mutation,
  useTestDataSource: () => mutation,
  useCreateDataSource: () => mutation,
}));

describe('DpoReviewExperienceMVP', () => {
  it('shows the source of the opened run and does not load a scan scope for it', () => {
    render(
      <MemoryRouter>
        <DpoReviewExperienceMVP initialRunId={54} />
      </MemoryRouter>,
    );

    expect(screen.getByRole('button', { name: 'Nguồn dữ liệu: DB01' })).toBeInTheDocument();
    expect(vi.mocked(hooks.useSourceScope)).toHaveBeenCalled();
    expect(vi.mocked(hooks.useSourceScope).mock.calls.every(([sourceId]) => sourceId === null)).toBe(true);
  });
});
