'use client';
import { useState } from 'react';
import type { SessionUser } from '@healthcare/types';
import { useAuth } from '@/components/auth/AuthProvider';
import { ErrorBanner, SuccessBanner } from '@/components/ui/Feedback';
import { Field } from '@/components/ui/Fields';
import { api, errorMessage } from '@/lib/api-client';
import { readForm } from '@/lib/form';

export function ResendVerificationButton() {
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function resend() {
    setError('');
    try {
      const result = await api<{ message: string }>('/auth/resend-verification', { method: 'POST' });
      setMessage(result.message);
    } catch (failure) {
      setError(errorMessage(failure));
    }
  }

  return (
    <>
      <ErrorBanner message={error} onDismiss={() => setError('')} />
      <SuccessBanner message={message} />
      <button className="btn secondary small" onClick={() => void resend()}>Resend verification email</button>
    </>
  );
}

export function ChangePasswordForm() {
  const { setUser } = useAuth();
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const { currentPassword, newPassword, confirmPassword } = readForm(form);
    setError('');
    setMessage('');
    if (newPassword !== confirmPassword) return setError('The new passwords do not match');
    setBusy(true);
    try {
      const result = await api<{ user: SessionUser }>('/auth/password', { method: 'PATCH', body: { currentPassword, newPassword } });
      setUser(result.user);
      form.reset();
      setMessage('Password updated. Other devices have been signed out.');
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <ErrorBanner message={error} onDismiss={() => setError('')} />
      <SuccessBanner message={message} />
      <form onSubmit={submit}>
        <Field label="Current password" name="currentPassword" type="password" required autoComplete="current-password" />
        <Field label="New password (12+ characters)" name="newPassword" type="password" required minLength={12} autoComplete="new-password" />
        <Field label="Confirm new password" name="confirmPassword" type="password" required minLength={12} autoComplete="new-password" />
        <button className="btn primary" disabled={busy}>{busy ? 'Saving…' : 'Update password'}</button>
      </form>
    </>
  );
}

export function SignOutEverywhereButton() {
  const { logout } = useAuth();

  async function signOutEverywhere() {
    if (!window.confirm('Sign out of every device, including this one?')) return;
    await api('/auth/logout-all', { method: 'POST' }).catch(() => undefined);
    await logout();
  }

  return <button className="btn danger" onClick={() => void signOutEverywhere()}>Sign out of all devices</button>;
}
