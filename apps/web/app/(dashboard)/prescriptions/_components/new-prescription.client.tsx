'use client';
import { Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { ErrorBanner } from '@/components/ui/Feedback';
import { ComboboxField } from '@/components/ui/ComboboxField';
import { Field, TextArea } from '@/components/ui/Fields';
import { Modal, ModalActions } from '@/components/ui/Modal';
import { api, errorMessage } from '@/lib/api-client';
import { readForm } from '@/lib/form';
import { fetchPatientOptions, recordOptionsFetcher } from '@/lib/option-fetchers';
import { useRefreshAction } from '@/lib/use-action';

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
  const [patientId, setPatientId] = useState('');
  const fetchRecords = useMemo(() => recordOptionsFetcher(patientId), [patientId]);
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
      <ComboboxField label="Patient" name="patientId" required placeholder="Search by name, email, phone or ID" fetchOptions={fetchPatientOptions} onValueChange={setPatientId} />
      {patientId && <ComboboxField key={patientId} label="Related medical record (optional)" name="medicalRecordId" placeholder="Search diagnoses…" fetchOptions={fetchRecords} />}
      <Field label="Medication" name="medication" required />
      <div className="field-row"><Field label="Dosage" name="dosage" required /><Field label="Frequency" name="frequency" required /></div>
      <Field label="Duration" name="duration" required />
      <TextArea label="Instructions" name="instructions" rows={2} />
      <ModalActions onCancel={onClose} submitLabel="Save prescription" busy={busy} />
    </Modal>
  );
}
