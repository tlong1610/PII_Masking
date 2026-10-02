import { describe, expect, it } from 'vitest';
import { detectEngine, isUserSource, parseTables, sourceFormSchema } from './sourceForm';

const valid = { name: 'Corp DB', url: 'postgresql://u:p@db.example.com:5432/shop', namespace: '', tables: '' };

describe('sourceFormSchema', () => {
  it('accepts postgres and mongo URLs', () => {
    expect(sourceFormSchema.safeParse(valid).success).toBe(true);
    expect(sourceFormSchema.safeParse({ ...valid, url: 'mongodb+srv://u:p@c.example.com/corp' }).success).toBe(true);
  });

  it('rejects other schemes and empty names', () => {
    expect(sourceFormSchema.safeParse({ ...valid, url: 'mysql://u:p@h/db' }).success).toBe(false);
    expect(sourceFormSchema.safeParse({ ...valid, name: '  ' }).success).toBe(false);
  });
});

describe('helpers', () => {
  it('detects engine from scheme', () => {
    expect(detectEngine('postgres://u@h/db')).toBe('postgresql');
    expect(detectEngine('MONGODB://h')).toBe('mongodb');
    expect(detectEngine('http://h')).toBeNull();
  });

  it('parses the table allowlist', () => {
    expect(parseTables(' customers, orders ,,')).toEqual(['customers', 'orders']);
    expect(parseTables('')).toEqual([]);
  });

  it('recognises user-registered source ids', () => {
    expect(isUserSource('usr-abc123')).toBe(true);
    expect(isUserSource('sql-demo')).toBe(false);
  });
});
