import type { StatusTone } from '@/shared/ui';
import type { DatasetStatus } from './types';

const STATUS_LABELS: Record<DatasetStatus, string> = {
  STAGING: 'Đang dựng',
  VERIFIED: 'Chờ phát hành',
  PUBLISHED: 'Đã phát hành',
  REVOKED: 'Đã thu hồi',
  FAILED: 'Lỗi',
};

const STATUS_TONES: Record<DatasetStatus, StatusTone> = {
  STAGING: 'default',
  VERIFIED: 'info',
  PUBLISHED: 'success',
  REVOKED: 'error',
  FAILED: 'error',
};

export function getDatasetStatusLabel(status: DatasetStatus): string {
  return STATUS_LABELS[status];
}

export function getDatasetStatusTone(status: DatasetStatus): StatusTone {
  return STATUS_TONES[status];
}

/** Backend only publishes VERIFIED datasets. */
export function canPublish(status: DatasetStatus): boolean {
  return status === 'VERIFIED';
}

/** Revoke drops the physical snapshot, so it is offered only while one exists. */
export function canRevoke(status: DatasetStatus): boolean {
  return status === 'VERIFIED' || status === 'PUBLISHED';
}

export interface SnapshotLocation {
  engine: 'PostgreSQL' | 'MongoDB' | 'Demo';
  container: string;
  tables: string[];
  dropped: boolean;
}

const LOCATION_PREFIXES = [
  ['postgres://', 'PostgreSQL'],
  ['mongodb://', 'MongoDB'],
] as const;

/**
 * Parses `output_location` (e.g. `postgres://schema/t1,t2`, `mongodb://db/c1`). The value names
 * only the snapshot schema/database and tables — never hosts or credentials.
 */
export function parseSnapshotLocation(outputLocation: string): SnapshotLocation {
  const revoked = /^\[REVOKED_AND_DROPPED: (.*)\]$/.exec(outputLocation);
  const location = revoked?.[1] ?? outputLocation;
  for (const [prefix, engine] of LOCATION_PREFIXES) {
    if (location.startsWith(prefix)) {
      const [container = '', tableCsv = ''] = location.slice(prefix.length).split('/', 2);
      return { engine, container, tables: tableCsv.split(',').filter(Boolean), dropped: Boolean(revoked) };
    }
  }
  return { engine: 'Demo', container: location, tables: [], dropped: Boolean(revoked) };
}
