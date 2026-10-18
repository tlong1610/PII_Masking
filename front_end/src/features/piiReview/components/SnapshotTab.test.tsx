import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SnapshotTab } from './SnapshotTab';

vi.mock('@/features/datasets', () => ({
  useDatasetDetail: () => ({ data: undefined, isLoading: true }),
  DatasetPreviewTable: () => null,
  VerifierResultsTable: () => null,
}));

const pose = (): string | null | undefined => document.querySelector('img[data-pose]')?.getAttribute('data-pose');

describe('SnapshotTab mascot banner', () => {
  it('waits for the DPO before anything is saved', () => {
    render(<SnapshotTab datasetId={null} datasetStatus={null} />);
    expect(screen.getByRole('status')).toHaveTextContent('Chưa có dữ liệu cho Analyst');
    expect(pose()).toBe('awaiting');
  });

  it('warns when the data was revoked', () => {
    render(<SnapshotTab datasetId={4} datasetStatus="REVOKED" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Đã thu hồi');
    expect(pose()).toBe('error');
  });

  it('flags data that failed verification', () => {
    render(<SnapshotTab datasetId={4} datasetStatus="FAILED" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Chưa qua kiểm định');
    expect(pose()).toBe('error');
  });

  it('celebrates published, protected data', () => {
    render(<SnapshotTab datasetId={4} datasetStatus="PUBLISHED" />);
    // The banner comes first; the verifier section below shows Pango's loader while its results load.
    expect(screen.getAllByRole('status')[0]).toHaveTextContent('Đã phát hành cho Analyst');
    expect(pose()).toBe('protected');
  });
});
