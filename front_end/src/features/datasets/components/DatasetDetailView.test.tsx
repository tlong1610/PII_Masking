import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import * as api from '../api/datasetsApi';
import { DatasetDetailView } from './DatasetDetailView';

vi.mock('../api/datasetsApi', () => ({
  fetchDatasetDetail: vi.fn(() =>
    Promise.resolve({
      id: 5,
      run_id: 11,
      dataset_name: 'run-11-snapshot',
      status: 'VERIFIED',
      output_location: 'postgres://snapshot_run11/customers',
      created_at: '2026-10-10T09:00:00Z',
      published_at: null,
      revoked_at: null,
      source_id: 'sql-demo',
      source_name: 'SQL demo',
      engine: 'postgresql',
      grant_count: 0,
      run_status: 'VERIFIED',
      verifier_results: [
        {
          id: 1,
          check_name: 'row_count_customers',
          status: 'PASSED',
          baseline_value: '10',
          actual_value: '10',
          tolerance: '0',
          details: 'ok',
        },
      ],
      action_counts: { MASK: 3, HMAC: 1 },
    }),
  ),
  fetchDatasetPreview: vi.fn(() =>
    Promise.resolve({ dataset_id: 5, columns: [], rows: [], tables: ['customers'], selected_table: 'customers' }),
  ),
  fetchDatasetGrants: vi.fn(() => Promise.resolve([])),
  fetchAnalysts: vi.fn(() => Promise.resolve([{ id: 2, username: 'analyst', role: 'ANALYST' }])),
  publishDataset: vi.fn(() => Promise.resolve({})),
  revokeDataset: vi.fn(() => Promise.resolve({})),
  grantDatasetAccess: vi.fn(),
  revokeDatasetAccess: vi.fn(),
}));

function renderView(): void {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <DatasetDetailView datasetId={5} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('DatasetDetailView', () => {
  it('shows snapshot facts and verifier results for a verified dataset', async () => {
    renderView();

    expect(await screen.findByRole('heading', { name: 'run-11-snapshot' })).toBeInTheDocument();
    expect(screen.getByText('row_count_customers')).toBeInTheDocument();
    expect(screen.getByText('MASK: 3 cột')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Phát hành cho Analyst' })).toBeEnabled();
  });

  it('asks for confirmation before revoking the snapshot', async () => {
    renderView();

    fireEvent.click(await screen.findByRole('button', { name: 'Thu hồi' }));
    expect(screen.getByText('Thu hồi dataset?')).toBeInTheDocument();
    expect(api.revokeDataset).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Thu hồi và xoá snapshot' }));
    await waitFor(() => expect(api.revokeDataset).toHaveBeenCalled());
  });
});
