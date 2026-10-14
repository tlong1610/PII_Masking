import { describe, expect, it } from 'vitest';
import { getAuditActionLabel, getAuditEntityLink, shortenHash } from './auditLabels';

describe('getAuditActionLabel', () => {
  it('translates known actions and passes unknown ones through', () => {
    expect(getAuditActionLabel('publish_dataset')).toBe('Phát hành dataset');
    expect(getAuditActionLabel('some_new_action')).toBe('some_new_action');
  });
});

describe('shortenHash', () => {
  it('keeps the head and tail of a long digest', () => {
    const hash = 'a'.repeat(10) + 'b'.repeat(48) + 'c'.repeat(6);
    expect(shortenHash(hash)).toBe(`${'a'.repeat(10)}…${'c'.repeat(6)}`);
  });

  it('leaves short values untouched', () => {
    expect(shortenHash('0000')).toBe('0000');
  });
});

describe('getAuditEntityLink', () => {
  it('links runs and datasets by numeric id', () => {
    expect(getAuditEntityLink('run', '12')).toEqual({ kind: 'run', id: 12 });
    expect(getAuditEntityLink('dataset', '3')).toEqual({ kind: 'dataset', id: 3 });
  });

  it('does not link other entities or non-numeric ids', () => {
    expect(getAuditEntityLink('source', 'usr-abc')).toBeNull();
    expect(getAuditEntityLink('run', 'abc')).toBeNull();
  });
});
