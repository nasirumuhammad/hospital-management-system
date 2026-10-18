'use client';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { GENDERS, type Patient } from '@healthcare/types';
import { ErrorBanner } from '@/components/ui/Feedback';
import { Field, Select, TextArea } from '@/components/ui/Fields';
import { Modal, ModalActions } from '@/components/ui/Modal';
import { api, errorMessage } from '@/lib/api-client';
import { fullName } from '@/lib/format';
import { readForm, toPayload } from '@/lib/form';
import { useRefreshAction } from '@/lib/use-action';

const OPTIONAL_FIELDS = ['phone', 'dateOfBirth', 'gender', 'address'];

export function AddPatientButton() {
  const [open, setOpen] = useState(false);
  const { refresh } = useRefreshAction();
  return (
    <>
      <button className="btn primary" onClick={() => setOpen(true)}><Plus size={17} /> Add patient</button>
      {open && <PatientModal patient={null} onClose={() => setOpen(false)} onSaved={() => { setOpen(false); refresh(); }} />}
    </>
  );
}

export function PatientRowActions({ patient }: { patient: Patient }) {
  const [editing, setEditing] = useState(false);
  const { error, setError, run, refresh } = useRefreshAction();
  return (
    <>
      <div className="row-actions">
        <button className="btn secondary small" onClick={() => setEditing(true)}>Edit</button>
        <button className="btn danger small" onClick={() => window.confirm(`Remove ${fullName(patient)}? Their history is preserved.`) && void run(() => api(`/patients/${patient.id}`, { method: 'DELETE' }))}>Remove</button>
      </div>
      <ErrorBanner message={error} onDismiss={() => setError('')} />
      {editing && <PatientModal patient={patient} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); refresh(); }} />}
    </>
  );
}

function PatientModal({ patient, onClose, onSaved }: { patient: Patient | null; onClose: () => void; onSaved: () => void }) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = toPayload(readForm(event.currentTarget), OPTIONAL_FIELDS, patient ? 'update' : 'create');
    setBusy(true);
    try {
      await api(patient ? `/patients/${patient.id}` : '/patients', { method: patient ? 'PATCH' : 'POST', body });
      onSaved();
    } catch (failure) {
      setError(errorMessage(failure));
      setBusy(false);
    }
  }

  return (
    <Modal title={patient ? 'Edit patient' : 'Add patient'} eyebrow={patient ? 'UPDATE' : 'NEW RECORD'} onClose={onClose} onSubmit={submit}>
      <ErrorBanner message={error} />
      <div className="field-row">
        <Field label="First name" name="firstName" required defaultValue={patient?.firstName} />
        <Field label="Last name" name="lastName" required defaultValue={patient?.lastName} />
      </div>
      <Field label="Email address" name="email" type="email" required defaultValue={patient?.email} />
      <Field label="Phone number" name="phone" defaultValue={patient?.phone} />
      <div className="field-row">
        <Select label="Gender" name="gender" placeholder="Select gender" defaultValue={patient?.gender} options={GENDERS.map((g) => ({ value: g, label: g }))} />
        <Field label="Date of birth" name="dateOfBirth" type="date" defaultValue={patient?.dateOfBirth} />
      </div>
      <TextArea label="Address" name="address" rows={2} defaultValue={patient?.address} />
      <ModalActions onCancel={onClose} submitLabel="Save patient" busy={busy} />
    </Modal>
  );
}
