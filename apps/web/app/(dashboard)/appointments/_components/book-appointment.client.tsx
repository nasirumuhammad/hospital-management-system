'use client';
import { Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useCurrentUser } from '@/components/auth/AuthProvider';
import { ErrorBanner } from '@/components/ui/Feedback';
import { ComboboxField } from '@/components/ui/ComboboxField';
import { Field, TextArea } from '@/components/ui/Fields';
import { Modal, ModalActions } from '@/components/ui/Modal';
import { api, errorMessage } from '@/lib/api-client';
import { toIsoFromLocalInput } from '@/lib/format';
import { readForm } from '@/lib/form';
import { fetchDoctorOptions, fetchPatientOptions } from '@/lib/option-fetchers';

function localDateTimeInputMin(): string {
  const date = new Date();
  date.setMinutes(date.getMinutes() + 1, 0, 0);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function BookAppointmentButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className="btn primary" onClick={() => setOpen(true)}><Plus size={17} /> Book appointment</button>
      {open && <BookingModal onClose={() => setOpen(false)} onSaved={() => { setOpen(false); router.refresh(); }} />}
    </>
  );
}

// Patients and doctors are searched on the server as the user types, so nothing large is ever loaded.
function BookingModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const user = useCurrentUser();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = readForm(event.currentTarget);
    setBusy(true);
    try {
      await api('/appointments', { method: 'POST', body: { ...values, scheduledAt: toIsoFromLocalInput(values.scheduledAt), reason: values.reason || undefined, patientId: values.patientId || undefined } });
      onSaved();
    } catch (failure) {
      setError(errorMessage(failure));
      setBusy(false);
    }
  }

  return (
    <Modal title="Book appointment" eyebrow="NEW RECORD" onClose={onClose} onSubmit={submit}>
      <ErrorBanner message={error} />
      {user.role !== 'PATIENT' && <ComboboxField label="Patient" name="patientId" required placeholder="Search by name, email, phone or ID" fetchOptions={fetchPatientOptions} />}
      <ComboboxField label="Doctor" name="doctorId" required placeholder="Search by name, specialty or email" fetchOptions={fetchDoctorOptions} />
      <Field label="Date and time" name="scheduledAt" type="datetime-local" min={localDateTimeInputMin()} required />
      <TextArea label="Reason for visit" name="reason" />
      <ModalActions onCancel={onClose} submitLabel="Book appointment" busy={busy} />
    </Modal>
  );
}
