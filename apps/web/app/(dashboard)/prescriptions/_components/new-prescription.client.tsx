'use client';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import type { MedicalRecord, Patient } from '@healthcare/types';
import { ErrorBanner } from '@/components/ui/Feedback';
import { Field, Select, TextArea } from '@/components/ui/Fields';
import { Modal, ModalActions } from '@/components/ui/Modal';
import { api, errorMessage } from '@/lib/api-client';
import { formatDate, fullName } from '@/lib/format';
import { readForm } from '@/lib/form';
import { useRefreshAction } from '@/lib/use-action';
import { useList } from '@/lib/use-list';

const OPTION_LIMIT = 100;

export function NewPrescriptionButton() {
  const [open, setOpen] = useState(false);
  const { refresh } = useRefreshAction();
  return (
    <>
      <button className="btn primary" onClick={() => setOpen(true)}><Plus size={17} /> New prescription</button>
      {open && <PrescriptionModal onClose={() => setOpen(false)} onSaved={() => { setOpen(false); refresh(); }} />}
    </>
  );
}

function PrescriptionModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const patients = useList<Patient>('/patients', { limit: OPTION_LIMIT });
  const [patientId, setPatientId] = useState('');
  const records = useList<MedicalRecord>(patientId ? '/medical-records' : null, { patientId, limit: OPTION_LIMIT });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = readForm(event.currentTarget);
    setBusy(true);
    try {
      await api('/prescriptions', { method: 'POST', body: { ...values, medicalRecordId: values.medicalRecordId || undefined, instructions: values.instructions || undefined } });
      onSaved();
    } catch (failure) {
      setError(errorMessage(failure));
      setBusy(false);
    }
  }

  return (
    <Modal title="New prescription" eyebrow="CLINICAL" onClose={onClose} onSubmit={submit} wide>
      <ErrorBanner message={error} />
      <Select label="Patient" name="patientId" required placeholder="Select patient" onChange={setPatientId} options={patients.items.map((p) => ({ value: p.id, label: `${fullName(p)} · ${p.email}` }))} />
      {patientId && <Select key={patientId} label="Related medical record (optional)" name="medicalRecordId" placeholder="None" options={records.items.map((r) => ({ value: r.id, label: `${r.diagnosis} · ${formatDate(r.createdAt)}` }))} />}
      <Field label="Medication" name="medication" required />
      <div className="field-row"><Field label="Dosage" name="dosage" required /><Field label="Frequency" name="frequency" required /></div>
      <Field label="Duration" name="duration" required />
      <TextArea label="Instructions" name="instructions" rows={2} />
      <ModalActions onCancel={onClose} submitLabel="Save prescription" busy={busy} />
    </Modal>
  );
}
