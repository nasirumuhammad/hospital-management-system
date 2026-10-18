'use client';
import { useState } from 'react';
import { useAuth, useCurrentUser } from '@/components/auth/AuthProvider';
import { ErrorBanner, SuccessBanner } from '@/components/ui/Feedback';
import { Field } from '@/components/ui/Fields';
import { PageHeader } from '@/components/ui/Page';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { api, errorMessage } from '@/lib/api-client';
import { readForm } from '@/lib/form';
import type { SessionUser } from '@healthcare/types';

export default function SettingsPage() {
  const user = useCurrentUser();
  const { setUser, logout } = useAuth();
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function changePassword(event: React.FormEvent<HTMLFormElement>) {
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

  async function resendVerification() {
    setError('');
    try {
      const result = await api<{ message: string }>('/auth/resend-verification', { method: 'POST' });
      setMessage(result.message);
    } catch (failure) {
      setError(errorMessage(failure));
    }
  }

  async function signOutEverywhere() {
    if (!window.confirm('Sign out of every device, including this one?')) return;
    await api('/auth/logout-all', { method: 'POST' }).catch(() => undefined);
    await logout();
  }

  return (
    <>
      <PageHeader title="Settings" description="Your account and security." />
      <ErrorBanner message={error} onDismiss={() => setError('')} />
      <SuccessBanner message={message} />
      <div className="settings-grid">
        <div className="panel settings-card">
          <h3>Account</h3>
          <dl className="detail-list">
            <div><dt>Name</dt><dd>{user.name}</dd></div>
            <div><dt>Email</dt><dd>{user.email}</dd></div>
            <div><dt>Role</dt><dd><StatusBadge value={user.role} /></dd></div>
            <div><dt>Email status</dt><dd>{user.emailVerified ? 'Verified' : 'Not verified'}</dd></div>
          </dl>
          {!user.emailVerified && <button className="btn secondary small" onClick={() => void resendVerification()}>Resend verification email</button>}
        </div>
        <div className="panel settings-card">
          <h3>Change password</h3>
          <p>Changing your password signs you out of all other devices.</p>
          <form onSubmit={changePassword}>
            <Field label="Current password" name="currentPassword" type="password" required autoComplete="current-password" />
            <Field label="New password (12+ characters)" name="newPassword" type="password" required minLength={12} autoComplete="new-password" />
            <Field label="Confirm new password" name="confirmPassword" type="password" required minLength={12} autoComplete="new-password" />
            <button className="btn primary" disabled={busy}>{busy ? 'Saving…' : 'Update password'}</button>
          </form>
        </div>
        <div className="panel settings-card">
          <h3>Sessions</h3>
          <p>If you suspect someone else has access to your account, end every active session.</p>
          <button className="btn danger" onClick={() => void signOutEverywhere()}>Sign out of all devices</button>
        </div>
      </div>
    </>
  );
}
