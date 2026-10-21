'use client';
import { useState } from 'react';
import type { AppointmentStatus, UserRole } from '@healthcare/types';
import { Field } from '@/components/ui/Fields';
import { ErrorBanner } from '@/components/ui/Feedback';
import { useConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Modal, ModalActions } from '@/components/ui/Modal';
import { api, errorMessage } from '@/lib/api-client';
import { formatDateTime, titleCase, toIsoFromLocalInput } from '@/lib/format';
import { readForm } from '@/lib/form';
import { useRefreshAction } from '@/lib/use-action';

const NEXT_STATUSES: Record<AppointmentStatus, AppointmentStatus[]> = {
  PENDING: ['CONFIRMED', 'COMPLETED', 'CANCELLED'],
  CONFIRMED: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

export interface RowAppointment {
  id: string;
  status: AppointmentStatus;
  scheduledAt: string;
  doctorName: string;
}

export function AppointmentRowActions({ appointment, role }: { appointment: RowAppointment; role: UserRole }) {
  const [rescheduling, setRescheduling] = useState(false);
  const { error, setError, run, refresh } = useRefreshAction();
  const open = ['PENDING', 'CONFIRMED'].includes(appointment.status);
  const nextStatuses = NEXT_STATUSES[appointment.status];
  const base = `/appointments/${appointment.id}`;
  const confirmAction = useConfirmDialog();

  async function cancelAppointment() {
    const confirmed = await confirmAction({
      title: 'Cancel appointment',
      message: 'Cancel this appointment?',
      confirmLabel: 'Cancel appointment',
      cancelLabel: 'Keep appointment',
      tone: 'danger',
    });
    if (confirmed) await run(() => api(`${base}/cancel`, { method: 'POST' }));
  }

  async function deleteAppointment() {
    const confirmed = await confirmAction({
      title: 'Delete appointment',
      message: 'Delete this appointment record?',
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    if (confirmed) await run(() => api(base, { method: 'DELETE' }));
  }

  return (
    <>
      <div className="row-actions">
        {role !== 'PATIENT' && nextStatuses.length > 0 && (
          <select className="status-select" value="" aria-label="Change status"
            onChange={(event) => event.target.value && void run(() => api(`${base}/status`, { method: 'PATCH', body: { status: event.target.value } }))}>
            <option value="">Update…</option>
            {nextStatuses.map((next) => <option key={next} value={next}>{titleCase(next)}</option>)}
          </select>
        )}
        {role === 'ADMIN' && open && <button className="btn secondary small" onClick={() => setRescheduling(true)}>Reschedule</button>}
        {role === 'PATIENT' && open && (
          <button className="btn danger small" onClick={() => void cancelAppointment()}>Cancel</button>
        )}
        {role === 'ADMIN' && (
          <button className="btn danger small" onClick={() => void deleteAppointment()}>Delete</button>
        )}
      </div>
      <ErrorBanner message={error} onDismiss={() => setError('')} />
      {rescheduling && (
        <RescheduleModal appointment={appointment} onClose={() => setRescheduling(false)}
          onSaved={() => { setRescheduling(false); refresh(); }} />
      )}
    </>
  );
}

function RescheduleModal({ appointment, onClose, onSaved }: { appointment: RowAppointment; onClose: () => void; onSaved: () => void }) {
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
      <p className="lede">Currently {formatDateTime(appointment.scheduledAt)} with Dr. {appointment.doctorName}.</p>
      <Field label="New date and time" name="scheduledAt" type="datetime-local" required />
      <ModalActions onCancel={onClose} submitLabel="Reschedule" busy={busy} />
    </Modal>
  );
}
