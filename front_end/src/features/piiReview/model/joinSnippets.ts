export interface SnippetRelationship {
  source_table: string;
  source_column: string;
  target_table: string;
  target_column: string;
}

export interface SnippetColumn {
  name: string;
  source_path: string;
  transform: 'MASK' | 'HMAC' | 'KEEP' | 'DROPPED';
}

export interface JoinSnippet {
  key: string;
  description: string;
  sql: string;
}

function quoteIdentifier(name: string): string {
  return /^[a-z_][a-z0-9_]*$/.test(name) ? name : `"${name.replace(/"/g, '""')}"`;
}

/**
 * Example JOINs over the published snapshot, built only from real relationships whose two ends
 * survived protection. Text to copy — the app never executes it.
 */
export function buildJoinSnippets(relationships: SnippetRelationship[], columns: SnippetColumn[]): JoinSnippet[] {
  const transformOf = new Map(columns.map((column) => [`${column.source_path}.${column.name}`, column.transform]));
  const snippets: JoinSnippet[] = [];
  for (const rel of relationships) {
    const from = transformOf.get(`${rel.source_table}.${rel.source_column}`);
    const to = transformOf.get(`${rel.target_table}.${rel.target_column}`);
    if (!from || !to || from === 'DROPPED' || to === 'DROPPED' || from === 'MASK' || to === 'MASK') continue;
    const key = `${rel.source_table}.${rel.source_column}->${rel.target_table}.${rel.target_column}`;
    const hashed = from === 'HMAC' && to === 'HMAC';
    snippets.push({
      key,
      description: hashed
        ? `${rel.source_table}.${rel.source_column} ↔ ${rel.target_table}.${rel.target_column} (cả hai đầu đã HMAC bằng cùng khoá, nên giá trị băm vẫn khớp khi join)`
        : `${rel.source_table}.${rel.source_column} ↔ ${rel.target_table}.${rel.target_column}`,
      sql: [
        'SELECT a.*, b.*',
        `FROM ${quoteIdentifier(rel.source_table)} AS a`,
        `JOIN ${quoteIdentifier(rel.target_table)} AS b`,
        `  ON a.${quoteIdentifier(rel.source_column)} = b.${quoteIdentifier(rel.target_column)};`,
      ].join('\n'),
    });
  }
  return snippets;
}
