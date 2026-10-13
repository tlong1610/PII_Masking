import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import * as api from '../api/runHistoryApi';
import type { RunSummary } from '../api/runHistoryApi';
import { RunHistoryView } from './RunHistoryView';

const runs: RunSummary[] = [
  {
    id: 12,
    source_id: 'sql-demo',
    source_type: 'SQL',
    source_name: 'SQL demo',
    engine: 'postgresql',
    status: 'REVIEW_REQUIRED',
    created_by: 1,
    created_by_username: 'dpo',
    created_at: '2026-10-11T08:00:00Z',
    updated_at: '2026-10-11T08:05:00Z',
    field_count: 10,
    pii_field_count: 4,
    decided_count: 0,
    latest_dataset_id: null,
    latest_dataset_status: null,
  },
  {
    id: 11,
    source_id: 'sql-demo',
    source_type: 'SQL',
    source_name: 'SQL demo',
    engine: 'postgresql',
    status: 'VERIFIED',
    created_by: 1,
    created_by_username: 'dpo',
    created_at: '2026-10-10T08:00:00Z',
    updated_at: '2026-10-10T09:00:00Z',
    field_count: 10,
    pii_field_count: 4,
    decided_count: 10,
    latest_dataset_id: 5,
    latest_dataset_status: 'VERIFIED',
  },
];

vi.mock('../api/runHistoryApi', () => ({
  fetchRunHistory: vi.fn(() => Promise.resolve(runs)),
  deleteRun: vi.fn(() => Promise.resolve()),
}));

function renderView(): void {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <RunHistoryView />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('RunHistoryView', () => {
  it('lists runs with the next action for each status', async () => {
    renderView();

    expect(await screen.findByRole('link', { name: '#12' })).toHaveAttribute('href', '/dpo/runs/12');
    expect(screen.getByRole('link', { name: 'Tiếp tục duyệt' })).toHaveAttribute('href', '/dpo/runs/12');
    expect(screen.getByRole('link', { name: 'Xem & phát hành' })).toHaveAttribute('href', '/dpo/datasets/5');
    expect(screen.getByText('Chờ duyệt')).toBeInTheDocument();
  });

  it('deletes a selected run after confirmation', async () => {
    renderView();

    fireEvent.click(await screen.findByRole('checkbox', { name: 'Chọn run #12' }));
    fireEvent.click(screen.getByRole('button', { name: /Xoá 1 run đã chọn/ }));
    expect(api.deleteRun).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Xoá vĩnh viễn' }));
    await waitFor(() => expect(api.deleteRun).toHaveBeenCalledWith(12));
    expect(await screen.findByText(/Đã xoá 1 run/)).toBeInTheDocument();
  });

  it('does not let a run with a live snapshot be selected or deleted', async () => {
    renderView();

    expect(await screen.findByRole('checkbox', { name: 'Chọn run #11' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Xoá run #11' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Xoá run #12' })).toBeEnabled();
  });
});
