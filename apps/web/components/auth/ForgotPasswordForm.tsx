'use client';
import { useState } from 'react';
import { ErrorBanner, SuccessBanner } from '@/components/ui/Feedback';
import { Field } from '@/components/ui/Fields';
import { api, errorMessage } from '@/lib/api-client';
import { readForm } from '@/lib/form';

export function ForgotPasswordForm() {
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
    <>
      <ErrorBanner message={error} />
      <SuccessBanner message={message} />
      {!message && (
        <form onSubmit={submit}>
          <Field label="Email address" name="email" type="email" required autoComplete="username" />
          <button className="btn primary auth-submit" disabled={busy}>{busy ? 'Sending…' : 'Send reset link'}</button>
        </form>
      )}
    </>
  );
}
