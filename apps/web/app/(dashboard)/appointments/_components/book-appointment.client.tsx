'use client';
import { Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { Doctor, Patient } from '@healthcare/types';
import { useCurrentUser } from '@/components/auth/AuthProvider';
import { ErrorBanner } from '@/components/ui/Feedback';
import { Field, Select, TextArea } from '@/components/ui/Fields';
import { Modal, ModalActions } from '@/components/ui/Modal';
import { api, errorMessage } from '@/lib/api-client';
import { fullName, toIsoFromLocalInput } from '@/lib/format';
import { readForm } from '@/lib/form';
import { useList } from '@/lib/use-list';

const OPTION_LIMIT = 100;

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

// Options are fetched only when the modal opens, so the page itself never pays for them.
function BookingModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const user = useCurrentUser();
  const patients = useList<Patient>(user.role === 'ADMIN' ? '/patients' : null, { limit: OPTION_LIMIT });
  const doctors = useList<Doctor>('/doctors', { limit: OPTION_LIMIT });
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
      {user.role === 'ADMIN' && <Select label="Patient" name="patientId" required placeholder="Select patient" options={patients.items.map((p) => ({ value: p.id, label: `${fullName(p)} · ${p.email}` }))} />}
      <Select label="Doctor" name="doctorId" required placeholder="Select doctor" options={doctors.items.map((d) => ({ value: d.id, label: `Dr. ${fullName(d)} · ${d.specialty}` }))} />
      <Field label="Date and time" name="scheduledAt" type="datetime-local" required />
      <TextArea label="Reason for visit" name="reason" />
      <ModalActions onCancel={onClose} submitLabel="Book appointment" busy={busy} />
    </Modal>
  );
}
