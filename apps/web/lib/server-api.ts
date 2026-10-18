import 'server-only';
import { cookies } from 'next/headers';

const API_BASE_URL = process.env.API_INTERNAL_URL ?? process.env.API_URL ?? 'http://localhost:4000/api';

/** Server Component / Server Action API client. Never expose service URLs or tokens to the browser. */
export async function serverApi<T>(path: string, init: RequestInit = {}): Promise<T> {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.getAll().map(({ name, value }) => `${name}=${value}`).join('; ');
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: { ...(init.headers ?? {}), ...(cookieHeader ? { Cookie: cookieHeader } : {}) },
    cache: init.cache ?? 'no-store',
  });
  if (!response.ok) {
    throw new Error(`Hospital API request failed (${response.status})`);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
