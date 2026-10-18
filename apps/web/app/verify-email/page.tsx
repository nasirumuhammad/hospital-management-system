'use client';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef, useState } from 'react';
import { AuthCard } from '@/components/auth/AuthCard';
import { ErrorBanner, SuccessBanner } from '@/components/ui/Feedback';
import { api, errorMessage } from '@/lib/api-client';

function Verifier() {
  const token = useSearchParams().get('token') ?? '';
  const [state, setState] = useState<'working' | 'done' | 'failed'>('working');
  const [error, setError] = useState('');
  const started = useRef(false);

  useEffect(() => {
    if (started.current || !token) return;
    started.current = true;
    api('/auth/verify-email', { method: 'POST', body: { token } })
      .then(() => setState('done'))
      .catch((failure) => {
        setError(errorMessage(failure));
        setState('failed');
      });
  }, [token]);

  if (!token) return <ErrorBanner message="This verification link is incomplete." />;
  if (state === 'working') return <p className="auth-description">Verifying your email address…</p>;
  return state === 'done' ? <SuccessBanner message="Your email address is verified." /> : <ErrorBanner message={error} />;
}

export default function VerifyEmailPage() {
  return (
    <AuthCard eyebrow="ACCOUNT" title="Email verification" description="Confirming your email address with CarePoint.">
      <Suspense fallback={null}><Verifier /></Suspense>
      <div className="auth-links"><Link href="/login">Go to sign in</Link></div>
    </AuthCard>
  );
}
