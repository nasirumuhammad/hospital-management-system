'use client';
import { useCallback, useMemo, useState } from 'react';
import { USER_ROLES, type Doctor, type Patient, type SessionUser } from '@healthcare/types';
import { useCurrentUser } from '@/components/auth/AuthProvider';
import { EmptyState, ErrorBanner } from '@/components/ui/Feedback';
import { Field, Select } from '@/components/ui/Fields';
import { Modal, ModalActions } from '@/components/ui/Modal';
import { Pagination } from '@/components/ui/Pagination';
import { ListPanel, PageHeader } from '@/components/ui/Page';
import { SearchBox } from '@/components/ui/SearchBox';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { api, errorMessage } from '@/lib/api-client';
import { formatDate, fullName, titleCase } from '@/lib/format';
import { readForm } from '@/lib/form';
import { useList } from '@/lib/use-list';

const OPTION_LIMIT = 100;

export default function AccountsPage() {
  const me = useCurrentUser();
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [creating, setCreating] = useState(false);
  const [linking, setLinking] = useState<SessionUser | null>(null);
  const [actionError, setActionError] = useState('');
  const query = useMemo(() => ({ page, limit: 15, q: q || undefined }), [page, q]);
  const list = useList<SessionUser>('/users', query);
  const search = useCallback((term: string) => { setQ(term); setPage(1); }, []);

  async function toggle(account: SessionUser) {
    try {
      await api(`/users/${account.id}/active`, { method: 'PATCH', body: { isActive: !account.isActive } });
      await list.reload();
    } catch (failure) {
      setActionError(errorMessage(failure));
    }
  }

  return (
    <>
      <PageHeader title="Accounts" description="Sign-in accounts for staff and patients." actionLabel="Add account" onAction={() => setCreating(true)} />
      <ErrorBanner message={actionError || list.error} onDismiss={() => { setActionError(''); list.setError(''); }} />
      <ListPanel title="User accounts" description={`${list.data?.total ?? 0} accounts`} toolbar={<SearchBox onSearch={search} />}>
        <div className="table-scroll">
          <table>
            <thead><tr><th>Name</th><th>Email address</th><th>Role</th><th>Email</th><th>Status</th><th>Created</th><th>Actions</th></tr></thead>
            <tbody>
              {list.items.map((account) => (
                <tr key={account.id}>
                  <td><b>{account.name}</b></td><td>{account.email}</td>
                  <td><StatusBadge value={account.role} /></td>
                  <td>{account.emailVerified ? 'Verified' : 'Unverified'}</td>
                  <td><StatusBadge value={account.isActive ? 'ACTIVE' : 'DISABLED'} /></td>
                  <td>{formatDate(account.createdAt)}</td>
                  <td><div className="row-actions">
                    {account.role !== 'ADMIN' && <button className="btn secondary small" onClick={() => setLinking(account)}>Link profile</button>}
                    {account.id !== me.id && <button className="btn secondary small" onClick={() => void toggle(account)}>{account.isActive ? 'Disable' : 'Enable'}</button>}
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
          {list.items.length === 0 && <EmptyState loading={list.loading} label="accounts" />}
        </div>
        <Pagination data={list.data} onPage={setPage} />
      </ListPanel>
      {creating && <CreateAccountModal onClose={() => setCreating(false)} onSaved={() => { setCreating(false); void list.reload(); }} />}
      {linking && <LinkProfileModal account={linking} onClose={() => setLinking(null)} />}
    </>
  );
}

function CreateAccountModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    try {
      await api('/users', { method: 'POST', body: readForm(event.currentTarget) });
      onSaved();
    } catch (failure) {
      setError(errorMessage(failure));
      setBusy(false);
    }
  }

  return (
    <Modal title="Add user account" eyebrow="NEW RECORD" onClose={onClose} onSubmit={submit}>
      <ErrorBanner message={error} />
      <Field label="Full name" name="name" required />
      <Field label="Email address" name="email" type="email" required />
      <Field label="Temporary password (12+ characters)" name="password" type="password" required minLength={12} autoComplete="new-password" />
      <Select label="Role" name="role" required defaultValue="PATIENT" options={USER_ROLES.map((role) => ({ value: role, label: titleCase(role) }))} />
      <p className="auth-description">A verification email is sent to the new account.</p>
      <ModalActions onCancel={onClose} submitLabel="Create account" busy={busy} />
    </Modal>
  );
}

function LinkProfileModal({ account, onClose }: { account: SessionUser; onClose: () => void }) {
  const isPatient = account.role === 'PATIENT';
  const profiles = useList<Patient | Doctor>(isPatient ? '/patients' : '/doctors', { limit: OPTION_LIMIT });
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    try {
      await api('/users/link-profile', { method: 'POST', body: { userId: account.id, profileType: account.role, profileId: readForm(event.currentTarget).profileId } });
      setDone(true);
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title={`Link ${account.name}`} eyebrow="PROFILE" onClose={onClose} onSubmit={submit}>
      <ErrorBanner message={error} />
      {done && <p className="success-banner">Profile linked.</p>}
      <Select label={isPatient ? 'Patient profile' : 'Doctor profile'} name="profileId" required placeholder="Select profile"
        options={profiles.items.map((p) => ({ value: p.id, label: `${fullName(p)} · ${p.email}` }))} />
      <ModalActions onCancel={onClose} submitLabel="Link profile" busy={busy || done} />
    </Modal>
  );
}
