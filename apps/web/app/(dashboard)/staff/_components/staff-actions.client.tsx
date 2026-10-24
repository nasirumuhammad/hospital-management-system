'use client';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { STAFF_ROLES, type StaffMember } from '@healthcare/types';
import { ErrorBanner } from '@/components/ui/Feedback';
import { Checkbox, Field, Select } from '@/components/ui/Fields';
import { useConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Modal, ModalActions } from '@/components/ui/Modal';
import { api } from '@/lib/api-client';
import { fullName, titleCase } from '@/lib/format';
import { readForm, toPayload } from '@/lib/form';
import { createLoginFor, splitLoginChoice } from '@/lib/profile-login';
import { useRefreshAction } from '@/lib/use-action';
import { useProfileSave } from '@/lib/use-profile-save';

const OPTIONAL_FIELDS = ['phone', 'jobTitle'];
const ROLE_OPTIONS = STAFF_ROLES.map((role) => ({ value: role, label: titleCase(role) }));

export function AddStaffButton() {
  const [open, setOpen] = useState(false);
  const { refresh } = useRefreshAction();
  return (
    <>
      <button className="btn primary" onClick={() => setOpen(true)}><Plus size={17} /> Add staff member</button>
      {open && <StaffModal member={null} onClose={() => setOpen(false)} onSaved={() => { setOpen(false); refresh(); }} />}
    </>
  );
}

export function StaffRowActions({ member }: { member: StaffMember }) {
  const [editing, setEditing] = useState(false);
  const { error, setError, run, refresh } = useRefreshAction();
  const confirmAction = useConfirmDialog();

  async function removeMember() {
    const confirmed = await confirmAction({
      title: 'Remove staff member',
      message: `Remove ${fullName(member)}? Their history is preserved.`,
      confirmLabel: 'Remove',
      tone: 'danger',
    });
    if (confirmed) await run(() => api(`/staff/${member.id}`, { method: 'DELETE' }));
  }

  async function createLogin() {
    const confirmed = await confirmAction({
      title: 'Create login',
      message: `Create a ${titleCase(member.role)} login for ${fullName(member)} and email an invitation to ${member.email}?`,
      confirmLabel: 'Send invitation',
    });
    if (confirmed) await run(() => createLoginFor('STAFF', member.id));
  }

  return (
    <>
      <div className="row-actions">
        <button className="btn secondary small" onClick={() => setEditing(true)}>Edit</button>
        {!member.userId && <button className="btn secondary small" onClick={() => void createLogin()}>Create login</button>}
        <button className="btn secondary small" onClick={() => void run(() => api(`/staff/${member.id}`, { method: 'PATCH', body: { isActive: !member.isActive } }))}>{member.isActive ? 'Deactivate' : 'Activate'}</button>
        {!member.userId && <button className="btn danger small" onClick={() => void removeMember()}>Remove</button>}
      </div>
      <ErrorBanner message={error} onDismiss={() => setError('')} />
      {editing && <StaffModal member={member} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); refresh(); }} />}
    </>
  );
}

function StaffModal({ member, onClose, onSaved }: { member: StaffMember | null; onClose: () => void; onSaved: () => void }) {
  const { error, busy, partlySaved, save } = useProfileSave('Staff member', onSaved);
  const close = partlySaved ? onSaved : onClose;

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const { wantsLogin, recordValues } = splitLoginChoice(readForm(event.currentTarget));
    const body = toPayload(recordValues, OPTIONAL_FIELDS, member ? 'update' : 'create');
    const request = () => api<StaffMember>(member ? `/staff/${member.id}` : '/staff', { method: member ? 'PATCH' : 'POST', body });
    return save(request, wantsLogin ? (id) => createLoginFor('STAFF', id) : undefined);
  }

  return (
    <Modal title={member ? 'Edit staff member' : 'Add staff member'} eyebrow={member ? 'UPDATE' : 'NEW RECORD'} onClose={close} onSubmit={submit}>
      <ErrorBanner message={error} />
      <div className="field-row">
        <Field label="First name" name="firstName" required defaultValue={member?.firstName} />
        <Field label="Last name" name="lastName" required defaultValue={member?.lastName} />
      </div>
      <Field label="Email address" name="email" type="email" required defaultValue={member?.email} />
      <Field label="Phone number" name="phone" defaultValue={member?.phone} />
      {member?.userId
        ? <p className="auth-description">Role: {titleCase(member.role)}. It matches this person&apos;s login, so delete the account first to change it.</p>
        : <Select label="Role" name="role" required defaultValue={member?.role ?? 'NURSE'} options={ROLE_OPTIONS} />}
      <Field label="Job title" name="jobTitle" defaultValue={member?.jobTitle} />
      {!member && <Checkbox name="createLogin" label="Give this person a login" hint="Creates an account with this email address and role, and emails an invitation to choose a password." />}
      <ModalActions onCancel={close} submitLabel="Save staff member" busy={busy || partlySaved} />
    </Modal>
  );
}
