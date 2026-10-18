import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/shared/api/client';
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

vi.mock('@/features/datasets', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/datasets')>()),
  useRenameDataset: () => mutation,
}));

vi.mock('../hooks/usePiiReview', () => ({
  // SQL demo comes first: before the fix it overwrote the run's own source.
  useDataSources: () => ({
    data: [source('sql-demo', 'SQL demo'), source('usr-db01', 'DB01')],
    isLoading: false,
    refetch: vi.fn(),
  }),
  useSourceScope: vi.fn(() => ({ data: undefined })),
  useRun: (runId: number | null) => ({ data: runId === null ? undefined : run }),
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

  it('says the table list is loading instead of showing a bare grey box', () => {
    vi.mocked(hooks.useSourceScope).mockReturnValue({ data: undefined, isFetching: true } as never);
    render(
      <MemoryRouter>
        <DpoReviewExperienceMVP />
      </MemoryRouter>,
    );

    expect(screen.getByText('Đang đọc danh sách bảng từ nguồn…')).toBeInTheDocument();
  });

  it('shows why the table list failed and lets the DPO retry', () => {
    const refetch = vi.fn();
    vi.mocked(hooks.useSourceScope).mockReturnValue({
      data: undefined,
      isError: true,
      isFetching: false,
      error: new ApiError('Không đọc được cấu trúc bảng từ nguồn (OperationalError).', 502),
      refetch,
    } as never);
    render(
      <MemoryRouter>
        <DpoReviewExperienceMVP />
      </MemoryRouter>,
    );

    expect(screen.getByText('Không đọc được danh sách bảng của nguồn này')).toBeInTheDocument();
    expect(screen.getByText(/OperationalError/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
    expect(refetch).toHaveBeenCalled();
  });
});
