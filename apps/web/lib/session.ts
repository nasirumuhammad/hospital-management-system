import 'server-only';
import { cache } from 'react';
import { cookies } from 'next/headers';
import type { SessionUser } from '@healthcare/types';
import { serverApi, ServerApiError } from './server-api';

const ACCESS_COOKIE = 'cp_access';
const UNAUTHORIZED = 401;

/**
 * The signed-in user for this request, or null if there is no valid access token.
 * Wrapped in React `cache` so the root layout, the dashboard layout and the page
 * share one /auth/me call per request.
 */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  if (!(await cookies()).has(ACCESS_COOKIE)) return null;
  try {
    return await serverApi<SessionUser>('/auth/me');
  } catch (failure) {
    if (failure instanceof ServerApiError && failure.status === UNAUTHORIZED) return null;
    throw failure;
  }
});
