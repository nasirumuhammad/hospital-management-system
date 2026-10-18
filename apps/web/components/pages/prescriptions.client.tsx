'use client';
import { useMemo, useState } from 'react';
import type { MedicalRecord, Patient, Prescription } from '@healthcare/types';
import { useCurrentUser } from '@/components/auth/AuthProvider';
import { EmptyState, ErrorBanner } from '@/components/ui/Feedback';
import { Field, Select, TextArea } from '@/components/ui/Fields';
import { Modal, ModalActions } from '@/components/ui/Modal';
import { Pagination } from '@/components/ui/Pagination';
import { ListPanel, PageHeader, PersonCell } from '@/components/ui/Page';
import { api, errorMessage } from '@/lib/api-client';
import { formatDate, fullName } from '@/lib/format';
import { readForm } from '@/lib/form';
import { useList } from '@/lib/use-list';

const OPTION_LIMIT = 100;

export default function PrescriptionsPage() {
  const isDoctor = useCurrentUser().role === 'DOCTOR';
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const query = useMemo(() => ({ page, limit: 15 }), [page]);
  const list = useList<Prescription>('/prescriptions', query);

  return (
    <>
      <PageHeader title="Prescriptions" description="Medication orders." actionLabel={isDoctor ? 'New prescription' : undefined} onAction={() => setCreating(true)} />
      <ErrorBanner message={list.error} onDismiss={() => list.setError('')} />
      <ListPanel title="Prescriptions" description={`${list.data?.total ?? 0} prescriptions`}>
        <div className="table-scroll">
          <table>
            <thead><tr><th>Patient</th><th>Medication</th><th>Dosage</th><th>Frequency</th><th>Duration</th><th>Prescribed by</th><th>Date</th></tr></thead>
            <tbody>
              {list.items.map((item) => (
                <tr key={item.id}>
                  <td><PersonCell name={fullName(item.patient)} tone="patient" /></td>
                  <td><b>{item.medication}</b>{item.instructions && <small className="sub-cell">{item.instructions}</small>}</td>
                  <td>{item.dosage}</td><td>{item.frequency}</td><td>{item.duration}</td>
                  <td>Dr. {fullName(item.doctor)}</td><td>{formatDate(item.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {list.items.length === 0 && <EmptyState loading={list.loading} label="prescriptions" />}
        </div>
        <Pagination data={list.data} onPage={setPage} />
      </ListPanel>
      {creating && <PrescriptionModal onClose={() => setCreating(false)} onSaved={() => { setCreating(false); void list.reload(); }} />}
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
