const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';
const UNAUTHORIZED = 401;
const NO_REFRESH_PATHS = ['/auth/login', '/auth/refresh', '/auth/logout', '/auth/forgot-password', '/auth/reset-password', '/auth/verify-email'];

export class ApiError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
  }
}

type Query = Record<string, string | number | boolean | undefined | null>;
interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: Query;
}

let refreshInFlight: Promise<boolean> | null = null;
let onSessionExpired: (() => void) | null = null;

export function setSessionExpiredHandler(handler: (() => void) | null): void {
  onSessionExpired = handler;
}

function buildUrl(path: string, query?: Query): string {
  const params = new URLSearchParams();
  Object.entries(query ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value));
  });
  const suffix = params.size > 0 ? `?${params}` : '';
  return `${API_URL}${path}${suffix}`;
}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const data = await response.json();
    const message = Array.isArray(data.message) ? data.message.join('. ') : data.message;
    return message || 'Something went wrong';
  } catch {
    return 'Something went wrong';
  }
}

function refreshSession(): Promise<boolean> {
  refreshInFlight ??= fetch(`${API_URL}/auth/refresh`, { method: 'POST', credentials: 'include' })
    .then((response) => response.ok)
    .catch(() => false)
    .finally(() => {
      refreshInFlight = null;
    });
  return refreshInFlight;
}

function send(path: string, { method = 'GET', body, query }: RequestOptions): Promise<Response> {
  return fetch(buildUrl(path, query), {
    method,
    credentials: 'include',
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

export async function api<T = void>(path: string, options: RequestOptions = {}): Promise<T> {
  let response = await send(path, options);
  if (response.status === UNAUTHORIZED && !NO_REFRESH_PATHS.includes(path)) {
    if (await refreshSession()) response = await send(path, options);
    else onSessionExpired?.();
  }
  if (!response.ok) throw new ApiError(response.status, await readErrorMessage(response));
  return (response.status === 204 ? undefined : await response.json()) as T;
}

export function errorMessage(error: unknown, fallback = 'Something went wrong'): string {
  if (error instanceof ApiError) return error.message;
  return error instanceof TypeError ? 'Unable to reach the server' : fallback;
}
