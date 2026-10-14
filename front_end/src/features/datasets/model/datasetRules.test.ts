import { describe, expect, it } from 'vitest';
import { canManageGrants, canPublish, canRevoke, parseSnapshotLocation } from './datasetRules';

describe('dataset status rules', () => {
  it('only publishes VERIFIED datasets', () => {
    expect(canPublish('VERIFIED')).toBe(true);
    expect(canPublish('PUBLISHED')).toBe(false);
    expect(canPublish('REVOKED')).toBe(false);
  });

  it('revokes and manages grants only while a snapshot exists', () => {
    expect(canRevoke('VERIFIED')).toBe(true);
    expect(canRevoke('PUBLISHED')).toBe(true);
    expect(canRevoke('REVOKED')).toBe(false);
    expect(canManageGrants('PUBLISHED')).toBe(true);
    expect(canManageGrants('FAILED')).toBe(false);
  });
});

describe('parseSnapshotLocation', () => {
  it('parses a Postgres snapshot location', () => {
    expect(parseSnapshotLocation('postgres://snapshot_run3/customers,orders')).toEqual({
      engine: 'PostgreSQL',
      container: 'snapshot_run3',
      tables: ['customers', 'orders'],
      dropped: false,
    });
  });

  it('parses a Mongo snapshot location', () => {
    expect(parseSnapshotLocation('mongodb://shop_protected_run4/customers')).toMatchObject({
      engine: 'MongoDB',
      container: 'shop_protected_run4',
      tables: ['customers'],
    });
  });

  it('marks revoked locations as dropped', () => {
    expect(parseSnapshotLocation('[REVOKED_AND_DROPPED: postgres://snapshot_run3/customers]')).toMatchObject({
      engine: 'PostgreSQL',
      dropped: true,
    });
  });

  it('falls back to a demo location for stub builds', () => {
    expect(parseSnapshotLocation('staging://run/1/snapshot')).toMatchObject({ engine: 'Demo', tables: [] });
  });
});
