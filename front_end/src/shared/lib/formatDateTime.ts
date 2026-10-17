const DATE_TIME_FORMAT = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

/** Parses a backend timestamp; SQLite ones may lack a zone and are stored in UTC. Null when invalid. */
export function parseTimestamp(value: string | null | undefined): Date | null {
  if (!value) return null;
  const hasZone = /[zZ]|[+-]\d{2}:?\d{2}$/.test(value);
  const date = new Date(hasZone ? value : `${value}Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Formats an ISO timestamp from the API for display; empty or invalid input renders as a dash. */
export function formatDateTime(value: string | null | undefined): string {
  const date = parseTimestamp(value);
  return date ? DATE_TIME_FORMAT.format(date) : '—';
}
