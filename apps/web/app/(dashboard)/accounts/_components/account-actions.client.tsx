'use client';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { USER_ROLES, type Doctor, type Patient, type SessionUser } from '@healthcare/types';
import { ErrorBanner } from '@/components/ui/Feedback';
import { Field, Select } from '@/components/ui/Fields';
import { Modal, ModalActions } from '@/components/ui/Modal';
import { api, errorMessage } from '@/lib/api-client';
import { fullName, titleCase } from '@/lib/format';
import { readForm } from '@/lib/form';
import { useRefreshAction } from '@/lib/use-action';
import { useList } from '@/lib/use-list';

const OPTION_LIMIT = 100;

export function AddAccountButton() {
  const [open, setOpen] = useState(false);
  const { refresh } = useRefreshAction();
  return (
    <>
      <button className="btn primary" onClick={() => setOpen(true)}><Plus size={17} /> Add account</button>
      {open && <CreateAccountModal onClose={() => setOpen(false)} onSaved={() => { setOpen(false); refresh(); }} />}
    </>
  );
}

export function AccountRowActions({ account, isSelf }: { account: SessionUser; isSelf: boolean }) {
  const [linking, setLinking] = useState(false);
  const { error, setError, run } = useRefreshAction();
  return (
    <>
      <div className="row-actions">
        {account.role !== 'ADMIN' && <button className="btn secondary small" onClick={() => setLinking(true)}>Link profile</button>}
        {!isSelf && (
          <button className="btn secondary small" onClick={() => void run(() => api(`/users/${account.id}/active`, { method: 'PATCH', body: { isActive: !account.isActive } }))}>{account.isActive ? 'Disable' : 'Enable'}</button>
        )}
      </div>
      <ErrorBanner message={error} onDismiss={() => setError('')} />
      {linking && <LinkProfileModal account={account} onClose={() => setLinking(false)} />}
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
