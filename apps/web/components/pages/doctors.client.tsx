'use client';
import { useCallback, useMemo, useState } from 'react';
import type { Doctor } from '@healthcare/types';
import { useCurrentUser } from '@/components/auth/AuthProvider';
import { EmptyState, ErrorBanner } from '@/components/ui/Feedback';
import { Field } from '@/components/ui/Fields';
import { Modal, ModalActions } from '@/components/ui/Modal';
import { Pagination } from '@/components/ui/Pagination';
import { ListPanel, PageHeader, PersonCell } from '@/components/ui/Page';
import { SearchBox } from '@/components/ui/SearchBox';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { api, errorMessage } from '@/lib/api-client';
import { fullName } from '@/lib/format';
import { readForm, toPayload } from '@/lib/form';
import { useList } from '@/lib/use-list';

const OPTIONAL_FIELDS = ['phone', 'qualification'];

export default function DoctorsPage() {
  const isAdmin = useCurrentUser().role === 'ADMIN';
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [includeInactive, setIncludeInactive] = useState(false);
  const [editing, setEditing] = useState<Doctor | 'new' | null>(null);
  const [actionError, setActionError] = useState('');
  const query = useMemo(() => ({ page, limit: 15, q: q || undefined, includeInactive: isAdmin && includeInactive ? true : undefined }), [page, q, includeInactive, isAdmin]);
  const list = useList<Doctor>('/doctors', query);
  const search = useCallback((term: string) => { setQ(term); setPage(1); }, []);

  async function run(action: () => Promise<unknown>) {
    try {
      await action();
      await list.reload();
    } catch (failure) {
      setActionError(errorMessage(failure));
    }
  }

  const toggleActive = (doctor: Doctor) => run(() => api(`/doctors/${doctor.id}`, { method: 'PATCH', body: { isActive: !doctor.isActive } }));
  const remove = (doctor: Doctor) => window.confirm(`Remove Dr. ${fullName(doctor)}? Their history is preserved.`) && run(() => api(`/doctors/${doctor.id}`, { method: 'DELETE' }));

  return (
    <>
      <PageHeader title="Doctors" description="The medical team." actionLabel={isAdmin ? 'Add doctor' : undefined} onAction={() => setEditing('new')} />
      <ErrorBanner message={actionError || list.error} onDismiss={() => { setActionError(''); list.setError(''); }} />
      <ListPanel title="Medical team" description={`${list.data?.total ?? 0} doctors`} toolbar={<>
        {isAdmin && <label className="online"><input type="checkbox" checked={includeInactive} onChange={(event) => { setIncludeInactive(event.target.checked); setPage(1); }} /> Show inactive</label>}
        <SearchBox onSearch={search} />
      </>}>
        <div className="table-scroll">
          <table>
            <thead><tr><th>Doctor</th><th>Specialty</th><th>Email address</th><th>Qualification</th><th>Status</th>{isAdmin && <th>Actions</th>}</tr></thead>
            <tbody>
              {list.items.map((doctor) => (
                <tr key={doctor.id}>
                  <td><PersonCell name={`Dr. ${fullName(doctor)}`} tone="doctor" /></td>
                  <td>{doctor.specialty}</td><td>{doctor.email}</td><td>{doctor.qualification || '—'}</td>
                  <td><StatusBadge value={doctor.isActive ? 'ACTIVE' : 'INACTIVE'} /></td>
                  {isAdmin && <td><div className="row-actions">
                    <button className="btn secondary small" onClick={() => setEditing(doctor)}>Edit</button>
                    <button className="btn secondary small" onClick={() => void toggleActive(doctor)}>{doctor.isActive ? 'Deactivate' : 'Activate'}</button>
                    <button className="btn danger small" onClick={() => void remove(doctor)}>Remove</button>
                  </div></td>}
                </tr>
              ))}
            </tbody>
          </table>
          {list.items.length === 0 && <EmptyState loading={list.loading} label="doctors" />}
        </div>
        <Pagination data={list.data} onPage={setPage} />
      </ListPanel>
      {editing && <DoctorModal doctor={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); void list.reload(); }} />}
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
