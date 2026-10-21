'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { ErrorBanner } from '@/components/ui/Feedback';
import { Field } from '@/components/ui/Fields';
import { errorMessage } from '@/lib/api-client';
import { readForm } from '@/lib/form';

export function LoginForm() {
  const { login } = useAuth();
  const router = useRouter();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const { email, password } = readForm(event.currentTarget);
    setBusy(true);
    setError('');
    try {
      const signedInUser = await login(email, password);
      router.replace(signedInUser.role === 'SUPER_ADMIN' ? '/platform/hospitals' : '/');
      router.refresh(); // re-render server components with the new session cookie
    } catch (failure) {
      setError(errorMessage(failure, 'Sign in failed'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <ErrorBanner message={error} />
      <form onSubmit={submit}>
        <Field label="Email address" name="email" type="email" required autoComplete="username" />
        <Field label="Password" name="password" type="password" required autoComplete="current-password" />
        <button className="btn primary auth-submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in securely'}</button>
      </form>
    </>
  );
}
