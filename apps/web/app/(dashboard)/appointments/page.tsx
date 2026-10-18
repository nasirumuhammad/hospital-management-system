'use client';
import { useCallback, useMemo, useState } from 'react';
import { APPOINTMENT_STATUSES, type Appointment, type AppointmentStatus, type Doctor, type Patient } from '@healthcare/types';
import { useCurrentUser } from '@/components/auth/AuthProvider';
import { EmptyState, ErrorBanner } from '@/components/ui/Feedback';
import { Field, Select, TextArea } from '@/components/ui/Fields';
import { Modal, ModalActions } from '@/components/ui/Modal';
import { Pagination } from '@/components/ui/Pagination';
import { ListPanel, PageHeader, PersonCell } from '@/components/ui/Page';
import { SearchBox } from '@/components/ui/SearchBox';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { api, errorMessage } from '@/lib/api-client';
import { formatDateTime, fullName, titleCase, toIsoFromLocalInput } from '@/lib/format';
import { readForm } from '@/lib/form';
import { useList } from '@/lib/use-list';

const NEXT_STATUSES: Record<AppointmentStatus, AppointmentStatus[]> = {
  PENDING: ['CONFIRMED', 'COMPLETED', 'CANCELLED'],
  CONFIRMED: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};
const OPTION_LIMIT = 100;

export default function AppointmentsPage() {
  const user = useCurrentUser();
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [creating, setCreating] = useState(false);
  const [rescheduling, setRescheduling] = useState<Appointment | null>(null);
  const [actionError, setActionError] = useState('');
  const query = useMemo(() => ({ page, limit: 15, q: q || undefined, status: status || undefined, order: 'desc' as const }), [page, q, status]);
  const list = useList<Appointment>('/appointments', query);
  const search = useCallback((term: string) => { setQ(term); setPage(1); }, []);

  async function run(action: () => Promise<unknown>) {
    setActionError('');
    try {
      await action();
      await list.reload();
    } catch (failure) {
      setActionError(errorMessage(failure));
    }
  }

  const changeStatus = (item: Appointment, next: string) =>
    run(() => api(`/appointments/${item.id}/status`, { method: 'PATCH', body: { status: next } }));
  const cancel = (item: Appointment) => window.confirm('Cancel this appointment?') && run(() => api(`/appointments/${item.id}/cancel`, { method: 'POST' }));
  const remove = (item: Appointment) => window.confirm('Delete this appointment record?') && run(() => api(`/appointments/${item.id}`, { method: 'DELETE' }));

  return (
    <>
      <PageHeader title="Appointments" description="Schedule and track patient visits."
        actionLabel={user.role === 'DOCTOR' ? undefined : 'Book appointment'} onAction={() => setCreating(true)} />
      <ErrorBanner message={actionError || list.error} onDismiss={() => { setActionError(''); list.setError(''); }} />
      <ListPanel title="Appointment schedule" description={`${list.data?.total ?? 0} appointments`} toolbar={<>
        <select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} aria-label="Filter by status">
          <option value="">All statuses</option>
          {APPOINTMENT_STATUSES.map((value) => <option key={value} value={value}>{titleCase(value)}</option>)}
        </select>
        <SearchBox onSearch={search} />
      </>}>
        <div className="table-scroll">
          <table>
            <thead><tr><th>Patient</th><th>Doctor</th><th>Date & time</th><th>Reason</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {list.items.map((item) => (
                <tr key={item.id}>
                  <td><PersonCell name={fullName(item.patient)} tone="patient" /></td>
                  <td>Dr. {fullName(item.doctor)}<small className="sub-cell">{item.doctor?.specialty}</small></td>
                  <td>{formatDateTime(item.scheduledAt)}</td>
                  <td>{item.reason || '—'}</td>
                  <td><StatusBadge value={item.status} /></td>
                  <td>
                    <div className="row-actions">
                      {user.role !== 'PATIENT' && NEXT_STATUSES[item.status].length > 0 && (
                        <select className="status-select" value="" onChange={(event) => event.target.value && void changeStatus(item, event.target.value)} aria-label="Change status">
                          <option value="">Update…</option>
                          {NEXT_STATUSES[item.status].map((next) => <option key={next} value={next}>{titleCase(next)}</option>)}
                        </select>
                      )}
                      {user.role === 'ADMIN' && ['PENDING', 'CONFIRMED'].includes(item.status) && <button className="btn secondary small" onClick={() => setRescheduling(item)}>Reschedule</button>}
                      {user.role === 'PATIENT' && ['PENDING', 'CONFIRMED'].includes(item.status) && <button className="btn danger small" onClick={() => void cancel(item)}>Cancel</button>}
                      {user.role === 'ADMIN' && <button className="btn danger small" onClick={() => void remove(item)}>Delete</button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {list.items.length === 0 && <EmptyState loading={list.loading} label="appointments" />}
        </div>
        <Pagination data={list.data} onPage={setPage} />
      </ListPanel>
      {creating && <BookingModal onClose={() => setCreating(false)} onSaved={() => { setCreating(false); void list.reload(); }} />}
      {rescheduling && <RescheduleModal appointment={rescheduling} onClose={() => setRescheduling(null)} onSaved={() => { setRescheduling(null); void list.reload(); }} />}
    </>
  );
}

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

function RescheduleModal({ appointment, onClose, onSaved }: { appointment: Appointment; onClose: () => void; onSaved: () => void }) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = readForm(event.currentTarget);
    setBusy(true);
    try {
      await api(`/appointments/${appointment.id}`, { method: 'PATCH', body: { scheduledAt: toIsoFromLocalInput(values.scheduledAt) } });
      onSaved();
    } catch (failure) {
      setError(errorMessage(failure));
      setBusy(false);
    }
  }

  return (
    <Modal title="Reschedule appointment" eyebrow="UPDATE" onClose={onClose} onSubmit={submit}>
      <ErrorBanner message={error} />
      <p className="lede">Currently {formatDateTime(appointment.scheduledAt)} with Dr. {fullName(appointment.doctor)}.</p>
      <Field label="New date and time" name="scheduledAt" type="datetime-local" required />
      <ModalActions onCancel={onClose} submitLabel="Reschedule" busy={busy} />
    </Modal>
  );
}
