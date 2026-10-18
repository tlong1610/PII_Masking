import type { SqlAccess } from '../api/realPiiReviewApi';

/** postgresql:// URL for BI tools; without the password once it is no longer on screen. */
export function connectionUrl(access: SqlAccess, password: string | null): string {
  const secret = password ? `:${encodeURIComponent(password)}` : '';
  return `postgresql://${access.username}${secret}@${access.host}:${access.port}/${access.database}?sslmode=${access.sslmode}`;
}
