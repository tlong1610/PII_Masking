import { describe, expect, it } from 'vitest';
import { buildJoinSnippets, type SnippetColumn } from './joinSnippets';

const columns: SnippetColumn[] = [
  { name: 'customer_id', source_path: 'customers', transform: 'HMAC' },
  { name: 'customer_id', source_path: 'orders', transform: 'HMAC' },
  { name: 'email', source_path: 'customers', transform: 'MASK' },
  { name: 'notes', source_path: 'orders', transform: 'DROPPED' },
  { name: 'remark', source_path: 'orders', transform: 'REDACT' },
];

describe('buildJoinSnippets', () => {
  it('builds a JOIN for a relationship whose ends are both HMAC', () => {
    const [snippet] = buildJoinSnippets(
      [{ source_table: 'orders', source_column: 'customer_id', target_table: 'customers', target_column: 'customer_id' }],
      columns,
    );
    expect(snippet?.sql).toBe(
      'SELECT a.*, b.*\nFROM orders AS a\nJOIN customers AS b\n  ON a.customer_id = b.customer_id;',
    );
    expect(snippet?.description).toContain('HMAC');
  });

  it('skips relationships with a dropped, masked, redacted or unknown end', () => {
    expect(
      buildJoinSnippets(
        [
          { source_table: 'orders', source_column: 'notes', target_table: 'customers', target_column: 'customer_id' },
          { source_table: 'orders', source_column: 'customer_id', target_table: 'customers', target_column: 'email' },
          { source_table: 'orders', source_column: 'customer_id', target_table: 'piiguard_vault', target_column: 'token_id' },
          { source_table: 'orders', source_column: 'remark', target_table: 'customers', target_column: 'customer_id' },
        ],
        columns,
      ),
    ).toEqual([]);
  });

  it('quotes identifiers that are not plain lowercase names', () => {
    const [snippet] = buildJoinSnippets(
      [{ source_table: 'Order Items', source_column: 'customer_id', target_table: 'customers', target_column: 'customer_id' }],
      [...columns, { name: 'customer_id', source_path: 'Order Items', transform: 'HMAC' }],
    );
    expect(snippet?.sql).toContain('FROM "Order Items" AS a');
  });
});
