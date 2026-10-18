'use client';
import { useState } from 'react';
import { ErrorBanner, SuccessBanner } from '@/components/ui/Feedback';
import { Field } from '@/components/ui/Fields';
import { api, errorMessage } from '@/lib/api-client';
import { readForm } from '@/lib/form';

export function ResetPasswordForm({ token }: { token: string }) {
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const { newPassword, confirmPassword } = readForm(event.currentTarget);
    if (newPassword !== confirmPassword) return setError('The passwords do not match');
    setBusy(true);
    setError('');
    try {
      await api('/auth/reset-password', { method: 'POST', body: { token, newPassword } });
      setDone(true);
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <ErrorBanner message={error} />
      {done ? <SuccessBanner message="Password updated. You can now sign in." /> : (
        <form onSubmit={submit}>
          <Field label="New password (12+ characters)" name="newPassword" type="password" required minLength={12} autoComplete="new-password" />
          <Field label="Confirm new password" name="confirmPassword" type="password" required minLength={12} autoComplete="new-password" />
          <button className="btn primary auth-submit" disabled={busy}>{busy ? 'Saving…' : 'Set new password'}</button>
        </form>
      )}
    </>
  );
}
