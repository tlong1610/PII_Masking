/** Join between two tables/collections, FK side first (from GET /sources/{id}/scope). */
export interface ScopeRelationship {
  source_table: string;
  source_column: string;
  target_table: string;
  target_column: string;
}

/** An unselected table whose absence breaks joins between selected tables. */
export interface ScopeLinkGap {
  table: string;
  /** Selected tables that lose their join through `table`. */
  connects: string[];
}

export interface ScopeLinkAnalysis {
  /** Unselected tables referenced by an FK of a selected table: the FK points at nothing. */
  missingParents: ScopeLinkGap[];
  /** Unselected tables holding FKs to two or more selected tables (N–N link tables). */
  missingBridges: ScopeLinkGap[];
  /** Unselected tables that only reference selected ones: nothing breaks, shown as info. */
  missingChildren: string[];
}

/**
 * Which joins the selection cuts. Link-only tables count as included, but their own FKs are
 * ignored: the backend keeps only the keys that join scanned tables and drops the rest.
 */
export function analyzeScopeLinks(
  selected: string[],
  linkTables: string[],
  relationships: ScopeRelationship[],
): ScopeLinkAnalysis {
  const selectedSet = new Set(selected);
  const inScope = new Set([...selected, ...linkTables]);
  const parents = new Map<string, Set<string>>();
  const childTargets = new Map<string, Set<string>>();

  relationships.forEach((rel) => {
    const fromIn = inScope.has(rel.source_table);
    const toIn = inScope.has(rel.target_table);
    if (selectedSet.has(rel.source_table) && !toIn) {
      parents.set(rel.target_table, (parents.get(rel.target_table) ?? new Set()).add(rel.source_table));
    } else if (!fromIn && toIn) {
      childTargets.set(rel.source_table, (childTargets.get(rel.source_table) ?? new Set()).add(rel.target_table));
    }
  });

  const toGap = ([table, connects]: [string, Set<string>]): ScopeLinkGap => ({
    table,
    connects: [...connects].sort(),
  });
  const byTable = (a: ScopeLinkGap, b: ScopeLinkGap): number => a.table.localeCompare(b.table);

  const children = [...childTargets.entries()];
  return {
    missingParents: [...parents.entries()].map(toGap).sort(byTable),
    missingBridges: children.filter(([, targets]) => targets.size >= 2).map(toGap).sort(byTable),
    missingChildren: children
      .filter(([table, targets]) => targets.size < 2 && !parents.has(table))
      .map(([table]) => table)
      .sort(),
  };
}

/** Link-only tables still worth sending: not selected in full and still present in the source scope. */
export function effectiveLinkScope(linkScope: string[], selected: string[], available: string[]): string[] {
  const selectedSet = new Set(selected);
  const availableSet = new Set(available);
  return linkScope.filter((table) => !selectedSet.has(table) && availableSet.has(table));
}
