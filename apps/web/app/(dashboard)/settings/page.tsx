import { PageHeader } from '@/components/ui/Page';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { getSessionUser } from '@/lib/session';
import { ChangePasswordForm, ResendVerificationButton, SignOutEverywhereButton } from './_components/settings-forms.client';

export default async function SettingsPage() {
  const user = await getSessionUser();
  if (!user) return null;

  return (
    <>
      <PageHeader title="Settings" description="Your account and security." />
      <div className="settings-grid">
        <div className="panel settings-card">
          <h3>Account</h3>
          <dl className="detail-list">
            <div><dt>Name</dt><dd>{user.name}</dd></div>
            <div><dt>Email</dt><dd>{user.email}</dd></div>
            <div><dt>Role</dt><dd><StatusBadge value={user.role} /></dd></div>
            <div><dt>Email status</dt><dd>{user.emailVerified ? 'Verified' : 'Not verified'}</dd></div>
          </dl>
          {!user.emailVerified && <ResendVerificationButton />}
        </div>
        <div className="panel settings-card">
          <h3>Change password</h3>
          <p>Changing your password signs you out of all other devices.</p>
          <ChangePasswordForm />
        </div>
        <div className="panel settings-card">
          <h3>Sessions</h3>
          <p>If you suspect someone else has access to your account, end every active session.</p>
          <SignOutEverywhereButton />
        </div>
      </div>
    </>
  );
}
