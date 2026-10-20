const LOCAL_API_URL = 'http://localhost:4000/api';
const SAME_ORIGIN_API_URL = '/api';
const API_INTERNAL_URL_MISSING_MESSAGE = 'API_INTERNAL_URL is not defined';

/**
 * Base URL the browser uses. NEXT_PUBLIC_* is inlined at build time, so a
 * production build defaults to the same-origin /api proxy instead of silently
 * baking in localhost; development still talks to the local API directly.
 */
export function resolvePublicApiUrl(): string {
  const configured = process.env.NEXT_PUBLIC_API_URL;
  if (configured) return configured;
  return process.env.NODE_ENV === 'production' ? SAME_ORIGIN_API_URL : LOCAL_API_URL;
}

/**
 * Base URL the Next server uses to reach the API (Server Components and the
 * /api proxy). Read lazily, never at import, so `next build` does not need it;
 * outside development a missing value fails loudly instead of calling localhost.
 */
export function resolveInternalApiUrl(): string {
  const configured = process.env.API_INTERNAL_URL ?? process.env.API_URL;
  if (configured) return configured.replace(/\/$/, '');
  if (process.env.NODE_ENV !== 'production') return LOCAL_API_URL;
  throw new Error(API_INTERNAL_URL_MISSING_MESSAGE);
}
