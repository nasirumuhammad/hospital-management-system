'use client';
import Link from 'next/link';
import { useState } from 'react';
import { AuthCard } from '@/components/auth/AuthCard';
import { ErrorBanner, SuccessBanner } from '@/components/ui/Feedback';
import { Field } from '@/components/ui/Fields';
import { api, errorMessage } from '@/lib/api-client';
import { readForm } from '@/lib/form';

export default function ForgotPasswordPage() {
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const result = await api<{ message: string }>('/auth/forgot-password', { method: 'POST', body: { email: readForm(event.currentTarget).email } });
      setMessage(result.message);
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthCard eyebrow="ACCOUNT RECOVERY" title="Reset your password" description="Enter your email address and we will send you a reset link.">
      <ErrorBanner message={error} />
      <SuccessBanner message={message} />
      {!message && (
        <form onSubmit={submit}>
          <Field label="Email address" name="email" type="email" required autoComplete="username" />
          <button className="btn primary auth-submit" disabled={busy}>{busy ? 'Sending…' : 'Send reset link'}</button>
        </form>
      )}
      <div className="auth-links"><Link href="/login">Back to sign in</Link></div>
    </AuthCard>
  );
}
