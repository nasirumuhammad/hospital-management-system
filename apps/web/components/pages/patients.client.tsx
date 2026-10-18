'use client';
import { useCallback, useMemo, useState } from 'react';
import { GENDERS, type Patient } from '@healthcare/types';
import { useCurrentUser } from '@/components/auth/AuthProvider';
import { EmptyState, ErrorBanner } from '@/components/ui/Feedback';
import { Field, Select, TextArea } from '@/components/ui/Fields';
import { Modal, ModalActions } from '@/components/ui/Modal';
import { Pagination } from '@/components/ui/Pagination';
import { ListPanel, PageHeader, PersonCell } from '@/components/ui/Page';
import { SearchBox } from '@/components/ui/SearchBox';
import { api, errorMessage } from '@/lib/api-client';
import { fullName } from '@/lib/format';
import { readForm, toPayload } from '@/lib/form';
import { useList } from '@/lib/use-list';

const OPTIONAL_FIELDS = ['phone', 'dateOfBirth', 'gender', 'address'];

export default function PatientsPage() {
  const user = useCurrentUser();
  const isAdmin = user.role === 'ADMIN';
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState<Patient | 'new' | null>(null);
  const [actionError, setActionError] = useState('');
  const query = useMemo(() => ({ page, limit: 15, q: q || undefined }), [page, q]);
  const list = useList<Patient>('/patients', query);
  const search = useCallback((term: string) => { setQ(term); setPage(1); }, []);

  async function remove(patient: Patient) {
    if (!window.confirm(`Remove ${fullName(patient)}? Their history is preserved.`)) return;
    try {
      await api(`/patients/${patient.id}`, { method: 'DELETE' });
      await list.reload();
    } catch (failure) {
      setActionError(errorMessage(failure));
    }
  }

  return (
    <>
      <PageHeader title="Patients" description="Manage the patient directory." actionLabel={isAdmin ? 'Add patient' : undefined} onAction={() => setEditing('new')} />
      <ErrorBanner message={actionError || list.error} onDismiss={() => { setActionError(''); list.setError(''); }} />
      <ListPanel title="Patient directory" description={`${list.data?.total ?? 0} registered patients`} toolbar={<SearchBox onSearch={search} />}>
        <div className="table-scroll">
          <table>
            <thead><tr><th>Patient</th><th>Email address</th><th>Phone</th><th>Gender</th><th>Date of birth</th>{isAdmin && <th>Actions</th>}</tr></thead>
            <tbody>
              {list.items.map((patient) => (
                <tr key={patient.id}>
                  <td><PersonCell name={fullName(patient)} tone="patient" /></td>
                  <td>{patient.email}</td><td>{patient.phone || '—'}</td><td>{patient.gender || '—'}</td><td>{patient.dateOfBirth || '—'}</td>
                  {isAdmin && <td><div className="row-actions">
                    <button className="btn secondary small" onClick={() => setEditing(patient)}>Edit</button>
                    <button className="btn danger small" onClick={() => void remove(patient)}>Remove</button>
                  </div></td>}
                </tr>
              ))}
            </tbody>
          </table>
          {list.items.length === 0 && <EmptyState loading={list.loading} label="patients" />}
        </div>
        <Pagination data={list.data} onPage={setPage} />
      </ListPanel>
      {editing && <PatientModal patient={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); void list.reload(); }} />}
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
