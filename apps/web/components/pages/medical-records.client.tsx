'use client';
import { useMemo, useState } from 'react';
import type { MedicalRecord, Patient } from '@healthcare/types';
import { useCurrentUser } from '@/components/auth/AuthProvider';
import { EmptyState, ErrorBanner } from '@/components/ui/Feedback';
import { Field, Select, TextArea } from '@/components/ui/Fields';
import { Modal, ModalActions } from '@/components/ui/Modal';
import { Pagination } from '@/components/ui/Pagination';
import { ListPanel, PageHeader, PersonCell } from '@/components/ui/Page';
import { api, errorMessage } from '@/lib/api-client';
import { formatDate, fullName } from '@/lib/format';
import { readForm, toPayload } from '@/lib/form';
import { useList } from '@/lib/use-list';

const OPTION_LIMIT = 100;
const OPTIONAL_FIELDS = ['allergies', 'treatmentPlan'];

export default function MedicalRecordsPage() {
  const isDoctor = useCurrentUser().role === 'DOCTOR';
  const [page, setPage] = useState(1);
  const [viewing, setViewing] = useState<MedicalRecord | null>(null);
  const [editing, setEditing] = useState<MedicalRecord | 'new' | null>(null);
  const query = useMemo(() => ({ page, limit: 15 }), [page]);
  const list = useList<MedicalRecord>('/medical-records', query);

  return (
    <>
      <PageHeader title="Medical records" description="Clinical notes and treatment plans." actionLabel={isDoctor ? 'New record' : undefined} onAction={() => setEditing('new')} />
      <ErrorBanner message={list.error} onDismiss={() => list.setError('')} />
      <ListPanel title="Records" description={`${list.data?.total ?? 0} records you have access to`}>
        <div className="table-scroll">
          <table>
            <thead><tr><th>Patient</th><th>Diagnosis</th><th>Doctor</th><th>Date</th><th>Actions</th></tr></thead>
            <tbody>
              {list.items.map((record) => (
                <tr key={record.id}>
                  <td><PersonCell name={fullName(record.patient)} tone="patient" /></td>
                  <td>{record.diagnosis}</td>
                  <td>Dr. {fullName(record.doctor)}<small className="sub-cell">{record.doctor?.specialty}</small></td>
                  <td>{formatDate(record.createdAt)}</td>
                  <td><div className="row-actions">
                    <button className="btn secondary small" onClick={() => setViewing(record)}>View</button>
                    {isDoctor && <button className="btn secondary small" onClick={() => setEditing(record)}>Edit</button>}
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
          {list.items.length === 0 && <EmptyState loading={list.loading} label="medical records" />}
        </div>
        <Pagination data={list.data} onPage={setPage} />
      </ListPanel>
      {viewing && (
        <Modal title={viewing.diagnosis} eyebrow="MEDICAL RECORD" onClose={() => setViewing(null)} wide>
          <dl className="detail-list">
            <div><dt>Patient</dt><dd>{fullName(viewing.patient)}</dd></div>
            <div><dt>Doctor</dt><dd>Dr. {fullName(viewing.doctor)} · {viewing.doctor?.specialty}</dd></div>
            <div><dt>Notes</dt><dd>{viewing.notes}</dd></div>
            <div><dt>Allergies</dt><dd>{viewing.allergies || '—'}</dd></div>
            <div><dt>Treatment plan</dt><dd>{viewing.treatmentPlan || '—'}</dd></div>
          </dl>
        </Modal>
      )}
      {editing && <RecordModal record={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); void list.reload(); }} />}
    </>
  );
}

function RecordModal({ record, onClose, onSaved }: { record: MedicalRecord | null; onClose: () => void; onSaved: () => void }) {
  const patients = useList<Patient>(record ? null : '/patients', { limit: OPTION_LIMIT });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = toPayload(readForm(event.currentTarget), OPTIONAL_FIELDS, record ? 'update' : 'create');
    setBusy(true);
    try {
      await api(record ? `/medical-records/${record.id}` : '/medical-records', { method: record ? 'PATCH' : 'POST', body });
      onSaved();
    } catch (failure) {
      setError(errorMessage(failure));
      setBusy(false);
    }
  }

  return (
    <Modal title={record ? 'Edit record' : 'New medical record'} eyebrow="CLINICAL" onClose={onClose} onSubmit={submit} wide>
      <ErrorBanner message={error} />
      {!record && <Select label="Patient" name="patientId" required placeholder="Select patient" options={patients.items.map((p) => ({ value: p.id, label: `${fullName(p)} · ${p.email}` }))} />}
      <Field label="Diagnosis" name="diagnosis" required defaultValue={record?.diagnosis} />
      <TextArea label="Clinical notes" name="notes" required rows={5} defaultValue={record?.notes} />
      <TextArea label="Allergies" name="allergies" rows={2} defaultValue={record?.allergies} />
      <TextArea label="Treatment plan" name="treatmentPlan" rows={3} defaultValue={record?.treatmentPlan} />
      <ModalActions onCancel={onClose} submitLabel="Save record" busy={busy} />
    </Modal>
  );
}
