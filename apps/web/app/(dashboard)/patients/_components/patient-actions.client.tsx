'use client';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { GENDERS, type Patient } from '@healthcare/types';
import { ErrorBanner } from '@/components/ui/Feedback';
import { Checkbox, Field, Select, TextArea } from '@/components/ui/Fields';
import { useConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Modal, ModalActions } from '@/components/ui/Modal';
import { api } from '@/lib/api-client';
import { fullName } from '@/lib/format';
import { readForm, toPayload } from '@/lib/form';
import { createLoginFor, splitLoginChoice } from '@/lib/profile-login';
import { useRefreshAction } from '@/lib/use-action';
import { useProfileSave } from '@/lib/use-profile-save';

const OPTIONAL_FIELDS = ['email', 'dateOfBirth', 'address', 'middleName', 'nextOfKinName', 'nextOfKinPhone', 'nextOfKinRelationship'];
const today = (() => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
})();

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
  const confirmAction = useConfirmDialog();

  async function removePatient() {
    const confirmed = await confirmAction({
      title: 'Remove patient',
      message: `Remove ${fullName(patient)}? Their history is preserved.`,
      confirmLabel: 'Remove',
      tone: 'danger',
    });
    if (confirmed) await run(() => api(`/patients/${patient.id}`, { method: 'DELETE' }));
  }

  async function createLogin() {
    const confirmed = await confirmAction({
      title: 'Create login',
      message: `Create a login for ${fullName(patient)} and email an invitation to ${patient.email}?`,
      confirmLabel: 'Send invitation',
    });
    if (confirmed) await run(() => createLoginFor('PATIENT', patient.id));
  }

  return (
    <>
      <div className="row-actions">
        <button className="btn secondary small" onClick={() => setEditing(true)}>Edit</button>
        {!patient.userId && patient.email && <button className="btn secondary small" onClick={() => void createLogin()}>Create login</button>}
        <button className="btn danger small" onClick={() => void removePatient()}>Remove</button>
      </div>
      <ErrorBanner message={error} onDismiss={() => setError('')} />
      {editing && <PatientModal patient={patient} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); refresh(); }} />}
    </>
  );
}

function PatientModal({ patient, onClose, onSaved }: { patient: Patient | null; onClose: () => void; onSaved: () => void }) {
  const { error, busy, partlySaved, save } = useProfileSave('Patient', onSaved);
  const close = partlySaved ? onSaved : onClose;

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const { wantsLogin, recordValues } = splitLoginChoice(readForm(event.currentTarget));
    const body = toPayload(recordValues, OPTIONAL_FIELDS, patient ? 'update' : 'create');
    const request = () => api<Patient>(patient ? `/patients/${patient.id}` : '/patients', { method: patient ? 'PATCH' : 'POST', body });
    return save(request, wantsLogin ? (id) => createLoginFor('PATIENT', id) : undefined);
  }

  return (
    <Modal title={patient ? 'Edit patient' : 'Add patient'} eyebrow={patient ? 'UPDATE' : 'NEW RECORD'} onClose={close} onSubmit={submit}>
      <ErrorBanner message={error} />
      <div className="field-row">
        <Field label="First name" name="firstName" required minLength={1} maxLength={100} defaultValue={patient?.firstName} />
        <Field label="Last name" name="lastName" required minLength={1} maxLength={100} defaultValue={patient?.lastName} />
      </div>
      <Field label="Email address (optional)" name="email" type="email" maxLength={180} defaultValue={patient?.email} />
      <Field label="Phone number" name="phone" type="tel" required maxLength={30} pattern="\+?[0-9][0-9\s().-]*[0-9]" defaultValue={patient?.phone} />
      <Field label="Middle name (optional)" name="middleName" defaultValue={patient?.middleName} />
      <div className="field-row">
        <Select label="Gender" name="gender" placeholder="Select gender" required defaultValue={patient?.gender} options={GENDERS.map((g) => ({ value: g, label: g }))} />
        <Field label="Date of birth" name="dateOfBirth" type="date" max={today} defaultValue={patient?.dateOfBirth} />
      </div>
      <TextArea label="Address" name="address" rows={2} defaultValue={patient?.address} />
      <div className="field-row"><Field label="Next of kin" name="nextOfKinName" defaultValue={patient?.nextOfKinName} /><Field label="Next of kin phone" name="nextOfKinPhone" defaultValue={patient?.nextOfKinPhone} /></div>
      <Field label="Next of kin relationship" name="nextOfKinRelationship" defaultValue={patient?.nextOfKinRelationship} />
      {!patient && <Checkbox name="createLogin" label="Give this person a login" hint="Requires an email address. Creates an account with it and emails an invitation to choose a password." />}
      <ModalActions onCancel={close} submitLabel="Save patient" busy={busy || partlySaved} />
    </Modal>
  );
}
