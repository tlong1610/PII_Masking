export const DATASET_NAME_MAX = 120;

const DEFAULT_NAME = /^run-\d+-snapshot$/;

/** The name the DPO is offered on "Lưu": the current one, else "<source> – <tables>" instead of run-N-snapshot. */
export function suggestDatasetName(currentName: string | null | undefined, sourceName: string, tables: string[]): string {
  if (currentName && !DEFAULT_NAME.test(currentName)) return currentName;
  const shown = tables.length > 3 ? `${tables.slice(0, 3).join(', ')} +${tables.length - 3}` : tables.join(', ');
  const name = shown ? `${sourceName} – ${shown}` : sourceName;
  return name.slice(0, DATASET_NAME_MAX).trim();
}

export function cleanDatasetName(value: string): string {
  return value.split(/\s+/).filter(Boolean).join(' ');
}
