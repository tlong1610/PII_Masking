import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import type { Run } from '../api/realPiiReviewApi';
import { getReviewActions } from '../model/reviewActions';
import { RunHeader } from './RunHeader';

const run: Run = {
  id: 55,
  source_id: 'sql-demo',
  source_type: 'SQL',
  source_name: 'SQL demo',
  engine: 'postgresql',
  status: 'VERIFIED',
  created_by: 1,
  source_manifest_version: 'v1',
  policy_version: 'v1',
  field_profiles: [],
  field_decisions: [],
  datasets: [{ id: 26, run_id: 55, dataset_name: 'run-55-snapshot', status: 'VERIFIED', output_location: '' }],
};

function renderHeader(overrides: Partial<Parameters<typeof RunHeader>[0]> = {}) {
  const handlers = { onAction: vi.fn(), onOpenReport: vi.fn() };
  render(
    <MemoryRouter>
      <RunHeader
        sourcePicker={<span>SQL demo</span>}
        run={run}
        subtitle="Nguồn: SQL demo (postgresql) · Bảng customers"
        actions={getReviewActions({ runStatus: 'VERIFIED', datasetStatus: 'VERIFIED', hasPendingChanges: false })}
        busyLabel={null}
        primaryDisabled={false}
        {...handlers}
        {...overrides}
      />
    </MemoryRouter>,
  );
  return handlers;
}

describe('RunHeader', () => {
  it('offers publishing a saved run next to the report', () => {
    const { onAction, onOpenReport } = renderHeader();
    fireEvent.click(screen.getByRole('button', { name: 'Báo cáo tuân thủ' }));
    fireEvent.click(screen.getByRole('button', { name: 'Phát hành' }));
    expect(onAction.mock.calls).toEqual([['PUBLISH']]);
    expect(onOpenReport).toHaveBeenCalledOnce();
    expect(screen.getByRole('link', { name: 'Lịch sử quét' })).toHaveAttribute('href', '/dpo/runs');
  });

  it('asks to save unsaved edits instead of publishing', () => {
    const { onAction } = renderHeader({
      actions: getReviewActions({ runStatus: 'VERIFIED', datasetStatus: 'VERIFIED', hasPendingChanges: true }),
    });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu' }));
    expect(onAction.mock.calls).toEqual([['BUILD']]);
    expect(screen.queryByRole('button', { name: 'Phát hành' })).not.toBeInTheDocument();
  });

  it('offers revoking a published run', () => {
    const { onAction } = renderHeader({
      run: { ...run, status: 'PUBLISHED' },
      actions: getReviewActions({ runStatus: 'PUBLISHED', datasetStatus: 'PUBLISHED', hasPendingChanges: false }),
    });
    fireEvent.click(screen.getByRole('button', { name: 'Thu hồi' }));
    expect(onAction.mock.calls).toEqual([['REVOKE']]);
  });

  it('shows progress on the revoke button while it runs', () => {
    renderHeader({
      run: { ...run, status: 'PUBLISHED' },
      actions: getReviewActions({ runStatus: 'PUBLISHED', datasetStatus: 'PUBLISHED', hasPendingChanges: false }),
      busyLabel: 'Đang thu hồi…',
    });
    expect(screen.getByRole('button', { name: /Đang thu hồi/ })).toBeDisabled();
    expect(screen.getByRole('progressbar', { name: 'Đang thu hồi…' })).toBeInTheDocument();
  });
});
