const defaultApiUrl = import.meta.env.PROD
  ? 'https://piiguard-vn-api.onrender.com/api/v1'
  : 'http://localhost:8000/api/v1';

const envUrl = (
  import.meta.env.VITE_API_URL ||
  (import.meta.env as unknown as Record<string, string | undefined>).NEXT_PUBLIC_API_URL
);
const isLocalhost = envUrl && (envUrl.includes('localhost') || envUrl.includes('127.0.0.1'));

export const API_BASE_URL = (
  (import.meta.env.PROD && isLocalhost ? defaultApiUrl : (envUrl || defaultApiUrl))
).replace(/\/$/, '');

const AUTH_STORAGE_KEY = 'piiguard_auth_session';
const LEGACY_TOKEN_KEY = 'auth_token';
export const UNAUTHORIZED_EVENT = 'piiguard:unauthorized';

type StoredSession = {
  token?: unknown;
};

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public response?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

function readStoredToken(): string | null {
  const legacyToken = sessionStorage.getItem(LEGACY_TOKEN_KEY);
  if (legacyToken) return legacyToken;

  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as StoredSession;
    return typeof session.token === 'string' ? session.token : null;
  } catch {
    return null;
  }
}

function getErrorMessage(responseBody: unknown, fallback: string): string {
  if (
    typeof responseBody === 'object' &&
    responseBody !== null &&
    'detail' in responseBody
  ) {
    const detail = responseBody.detail;
    if (typeof detail === 'string') return detail;
    if (typeof detail === 'object' && detail !== null && 'message' in detail && typeof detail.message === 'string') {
      return detail.message;
    }
    if (detail) return JSON.stringify(detail);
  }

  if (
    typeof responseBody === 'object' &&
    responseBody !== null &&
    'message' in responseBody &&
    typeof responseBody.message === 'string'
  ) {
    return responseBody.message;
  }

  return fallback;
}

async function send(endpoint: string, options: RequestInit): Promise<Response> {
  const token = readStoredToken();
  const headers = new Headers(options.headers);

  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorBody: unknown = await response.json().catch(() => null);
    if (response.status === 401) {
      window.dispatchEvent(new CustomEvent(UNAUTHORIZED_EVENT));
    }
    throw new ApiError(
      getErrorMessage(errorBody, response.statusText),
      response.status,
      errorBody,
    );
  }

  return response;
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await send(endpoint, options);
  if (response.status === 204) {
    return undefined as T;
  }

  const data: unknown = await response.json();
  return data as T;
}

/** Like apiRequest, for endpoints that answer with a document (e.g. the HTML report) instead of JSON. */
export async function apiRequestText(endpoint: string, options: RequestInit = {}): Promise<string> {
  const response = await send(endpoint, options);
  return response.text();
}

export interface DownloadedFile {
  blob: Blob;
  filename: string | null;
}

/** For file downloads (e.g. the dataset export): the body as a Blob plus the server's filename. */
export async function apiRequestFile(endpoint: string, options: RequestInit = {}): Promise<DownloadedFile> {
  const response = await send(endpoint, options);
  const disposition = response.headers.get('Content-Disposition') ?? '';
  const filename = /filename="?([^";]+)"?/i.exec(disposition)?.[1] ?? null;
  return { blob: await response.blob(), filename };
}
