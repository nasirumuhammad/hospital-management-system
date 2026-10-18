'use client';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import type { Doctor } from '@healthcare/types';
import { ErrorBanner } from '@/components/ui/Feedback';
import { Field } from '@/components/ui/Fields';
import { Modal, ModalActions } from '@/components/ui/Modal';
import { api, errorMessage } from '@/lib/api-client';
import { fullName } from '@/lib/format';
import { readForm, toPayload } from '@/lib/form';
import { useRefreshAction } from '@/lib/use-action';

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
  return (
    <>
      <div className="row-actions">
        <button className="btn secondary small" onClick={() => setEditing(true)}>Edit</button>
        <button className="btn secondary small" onClick={() => void run(() => api(`/doctors/${doctor.id}`, { method: 'PATCH', body: { isActive: !doctor.isActive } }))}>{doctor.isActive ? 'Deactivate' : 'Activate'}</button>
        <button className="btn danger small" onClick={() => window.confirm(`Remove Dr. ${fullName(doctor)}? Their history is preserved.`) && void run(() => api(`/doctors/${doctor.id}`, { method: 'DELETE' }))}>Remove</button>
      </div>
      <ErrorBanner message={error} onDismiss={() => setError('')} />
      {editing && <DoctorModal doctor={doctor} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); refresh(); }} />}
    </>
  );
}

function DoctorModal({ doctor, onClose, onSaved }: { doctor: Doctor | null; onClose: () => void; onSaved: () => void }) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = toPayload(readForm(event.currentTarget), OPTIONAL_FIELDS, doctor ? 'update' : 'create');
    setBusy(true);
    try {
      await api(doctor ? `/doctors/${doctor.id}` : '/doctors', { method: doctor ? 'PATCH' : 'POST', body });
      onSaved();
    } catch (failure) {
      setError(errorMessage(failure));
      setBusy(false);
    }
  }

  return (
    <Modal title={doctor ? 'Edit doctor' : 'Add doctor'} eyebrow={doctor ? 'UPDATE' : 'NEW RECORD'} onClose={onClose} onSubmit={submit}>
      <ErrorBanner message={error} />
      <div className="field-row">
        <Field label="First name" name="firstName" required defaultValue={doctor?.firstName} />
        <Field label="Last name" name="lastName" required defaultValue={doctor?.lastName} />
      </div>
      <Field label="Email address" name="email" type="email" required defaultValue={doctor?.email} />
      <Field label="Phone number" name="phone" defaultValue={doctor?.phone} />
      <Field label="Specialty" name="specialty" required defaultValue={doctor?.specialty} />
      <Field label="Qualification" name="qualification" defaultValue={doctor?.qualification} />
      <ModalActions onCancel={onClose} submitLabel="Save doctor" busy={busy} />
    </Modal>
  );
}
