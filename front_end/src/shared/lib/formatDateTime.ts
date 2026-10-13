const DATE_TIME_FORMAT = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

/** Formats an ISO timestamp from the API for display; empty or invalid input renders as a dash. */
export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  // Backend timestamps from SQLite may lack a zone; they are stored in UTC.
  const hasZone = /[zZ]|[+-]\d{2}:?\d{2}$/.test(value);
  const date = new Date(hasZone ? value : `${value}Z`);
  return Number.isNaN(date.getTime()) ? '—' : DATE_TIME_FORMAT.format(date);
}
