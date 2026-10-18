'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { api } from '@/lib/api-client';

/**
 * Rendered when the access token has expired. Server Components cannot set cookies and the
 * refresh cookie is scoped to the API path, so the browser performs the rotation and then
 * asks Next to re-render on the server with the new access cookie.
 */
export function SessionRefresh() {
  const router = useRouter();
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return; // refresh tokens rotate: a second concurrent call would look like a replay
    started.current = true;
    api('/auth/refresh', { method: 'POST' })
      .then(() => router.refresh())
      .catch(() => router.replace('/login'));
  }, [router]);

  return <div className="auth-loading">Loading CarePoint…</div>;
}
