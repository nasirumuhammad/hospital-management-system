import 'server-only';
import { cookies } from 'next/headers';
import { resolveInternalApiUrl } from './api-base-url';

type Query = Record<string, string | number | boolean | undefined | null>;

export class ServerApiError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
  }
}

function buildQuery(query?: Query): string {
  const params = new URLSearchParams();
  Object.entries(query ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value));
  });
  return params.size > 0 ? `?${params}` : '';
}

/** Server Component / Server Action API client. Never expose service URLs or tokens to the browser. */
export async function serverApi<T>(path: string, { query, ...init }: RequestInit & { query?: Query } = {}): Promise<T> {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.getAll().map(({ name, value }) => `${name}=${value}`).join('; ');
  const response = await fetch(`${resolveInternalApiUrl()}${path}${buildQuery(query)}`, {
    ...init,
    headers: { ...(init.headers ?? {}), ...(cookieHeader ? { Cookie: cookieHeader } : {}) },
    cache: init.cache ?? 'no-store',
  });
  if (!response.ok) throw new ServerApiError(response.status, `Hospital API request failed (${response.status})`);
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
