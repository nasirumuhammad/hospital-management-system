'use client';
import { useEffect, useRef, useState } from 'react';
import { ErrorBanner, SuccessBanner } from '@/components/ui/Feedback';
import { api, errorMessage } from '@/lib/api-client';

export function EmailVerifier({ token }: { token: string }) {
  const [state, setState] = useState<'working' | 'done' | 'failed'>('working');
  const [error, setError] = useState('');
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return; // the token is single-use
    started.current = true;
    api('/auth/verify-email', { method: 'POST', body: { token } })
      .then(() => setState('done'))
      .catch((failure) => {
        setError(errorMessage(failure));
        setState('failed');
      });
  }, [token]);

  if (state === 'working') return <p className="auth-description">Verifying your email address…</p>;
  return state === 'done' ? <SuccessBanner message="Your email address is verified." /> : <ErrorBanner message={error} />;
}
