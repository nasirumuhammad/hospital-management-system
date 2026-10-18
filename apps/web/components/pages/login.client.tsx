'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { AuthCard } from '@/components/auth/AuthCard';
import { Field } from '@/components/ui/Fields';
import { ErrorBanner } from '@/components/ui/Feedback';
import { errorMessage } from '@/lib/api-client';
import { readForm } from '@/lib/form';

export default function LoginPage() {
  const { status, login } = useAuth();
  const router = useRouter();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (status === 'authenticated') router.replace('/');
  }, [status, router]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const { email, password } = readForm(event.currentTarget);
    setBusy(true);
    setError('');
    try {
      await login(email, password);
    } catch (failure) {
      setError(errorMessage(failure, 'Sign in failed'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthCard eyebrow="WELCOME BACK" title="Sign in to CarePoint" description="Access your hospital workspace securely.">
      <ErrorBanner message={error} />
      <form onSubmit={submit}>
        <Field label="Email address" name="email" type="email" required autoComplete="username" />
        <Field label="Password" name="password" type="password" required autoComplete="current-password" />
        <button className="btn primary auth-submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in securely'}</button>
      </form>
      <div className="auth-links"><Link href="/forgot-password">Forgot your password?</Link></div>
    </AuthCard>
  );
}
