'use client';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import type { Doctor } from '@healthcare/types';
import { ErrorBanner } from '@/components/ui/Feedback';
import { Checkbox, Field } from '@/components/ui/Fields';
import { useConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Modal, ModalActions } from '@/components/ui/Modal';
import { api } from '@/lib/api-client';
import { fullName } from '@/lib/format';
import { readForm, toPayload } from '@/lib/form';
import { createLoginFor, splitLoginChoice } from '@/lib/profile-login';
import { useRefreshAction } from '@/lib/use-action';
import { useProfileSave } from '@/lib/use-profile-save';

const OPTIONAL_FIELDS = ['phone', 'qualification'];

export function AddDoctorButton() {
  const [open, setOpen] = useState(false);
  const { refresh } = useRefreshAction();
  return (
    <>
      <button className="btn primary" onClick={() => setOpen(true)}><Plus size={17} /> Add doctor</button>
      {open && <DoctorModal doctor={null} onClose={() => setOpen(false)} onSaved={() => { setOpen(false); refresh(); }} />}
    </>
  );
}

export function DoctorRowActions({ doctor }: { doctor: Doctor }) {
  const [editing, setEditing] = useState(false);
  const { error, setError, run, refresh } = useRefreshAction();
  const confirmAction = useConfirmDialog();

  async function removeDoctor() {
    const confirmed = await confirmAction({
      title: 'Remove doctor',
      message: `Remove Dr. ${fullName(doctor)}? Their history is preserved.`,
      confirmLabel: 'Remove',
      tone: 'danger',
    });
    if (confirmed) await run(() => api(`/doctors/${doctor.id}`, { method: 'DELETE' }));
  }

  async function createLogin() {
    const confirmed = await confirmAction({
      title: 'Create login',
      message: `Create a login for Dr. ${fullName(doctor)} and email an invitation to ${doctor.email}?`,
      confirmLabel: 'Send invitation',
    });
    if (confirmed) await run(() => createLoginFor('DOCTOR', doctor.id));
  }

  return (
    <>
      <div className="row-actions">
        <button className="btn secondary small" onClick={() => setEditing(true)}>Edit</button>
        {!doctor.userId && <button className="btn secondary small" onClick={() => void createLogin()}>Create login</button>}
        <button className="btn secondary small" onClick={() => void run(() => api(`/doctors/${doctor.id}`, { method: 'PATCH', body: { isActive: !doctor.isActive } }))}>{doctor.isActive ? 'Deactivate' : 'Activate'}</button>
        <button className="btn danger small" onClick={() => void removeDoctor()}>Remove</button>
      </div>
      <ErrorBanner message={error} onDismiss={() => setError('')} />
      {editing && <DoctorModal doctor={doctor} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); refresh(); }} />}
    </>
  );
}

function DoctorModal({ doctor, onClose, onSaved }: { doctor: Doctor | null; onClose: () => void; onSaved: () => void }) {
  const { error, busy, partlySaved, save } = useProfileSave('Doctor', onSaved);
  const close = partlySaved ? onSaved : onClose;

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const { wantsLogin, recordValues } = splitLoginChoice(readForm(event.currentTarget));
    const body = toPayload(recordValues, OPTIONAL_FIELDS, doctor ? 'update' : 'create');
    const request = () => api<Doctor>(doctor ? `/doctors/${doctor.id}` : '/doctors', { method: doctor ? 'PATCH' : 'POST', body });
    return save(request, wantsLogin ? (id) => createLoginFor('DOCTOR', id) : undefined);
  }

  return (
    <Modal title={doctor ? 'Edit doctor' : 'Add doctor'} eyebrow={doctor ? 'UPDATE' : 'NEW RECORD'} onClose={close} onSubmit={submit}>
      <ErrorBanner message={error} />
      <div className="field-row">
        <Field label="First name" name="firstName" required defaultValue={doctor?.firstName} />
        <Field label="Last name" name="lastName" required defaultValue={doctor?.lastName} />
      </div>
      <Field label="Email address" name="email" type="email" required defaultValue={doctor?.email} />
      <Field label="Phone number" name="phone" defaultValue={doctor?.phone} />
      <Field label="Specialty" name="specialty" required defaultValue={doctor?.specialty} />
      <Field label="Qualification" name="qualification" defaultValue={doctor?.qualification} />
      {!doctor && <Checkbox name="createLogin" label="Give this person a login" hint="Creates an account with this email address and emails an invitation to choose a password." />}
      <ModalActions onCancel={close} submitLabel="Save doctor" busy={busy || partlySaved} />
    </Modal>
  );
}
