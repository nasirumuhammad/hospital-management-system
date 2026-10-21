'use client';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import type { MedicalRecord } from '@healthcare/types';
import { ErrorBanner } from '@/components/ui/Feedback';
import { ComboboxField } from '@/components/ui/ComboboxField';
import { Field, TextArea } from '@/components/ui/Fields';
import { Modal, ModalActions } from '@/components/ui/Modal';
import { api, errorMessage } from '@/lib/api-client';
import { fullName } from '@/lib/format';
import { readForm, toPayload } from '@/lib/form';
import { fetchPatientOptions } from '@/lib/option-fetchers';
import { useRefreshAction } from '@/lib/use-action';

const OPTIONAL_FIELDS = ['allergies', 'treatmentPlan'];

export function NewRecordButton() {
  const [open, setOpen] = useState(false);
  const { refresh } = useRefreshAction();
  return (
    <>
      <button className="btn primary" onClick={() => setOpen(true)}><Plus size={17} /> New record</button>
      {open && <RecordModal record={null} onClose={() => setOpen(false)} onSaved={() => { setOpen(false); refresh(); }} />}
    </>
  );
}

export function RecordRowActions({ record, canEdit }: { record: MedicalRecord; canEdit: boolean }) {
  const [mode, setMode] = useState<'view' | 'edit' | null>(null);
  const { refresh } = useRefreshAction();
  return (
    <>
      <div className="row-actions">
        <button className="btn secondary small" onClick={() => setMode('view')}>View</button>
        {canEdit && <button className="btn secondary small" onClick={() => setMode('edit')}>Edit</button>}
      </div>
      {mode === 'view' && (
        <Modal title={record.diagnosis} eyebrow="MEDICAL RECORD" onClose={() => setMode(null)} wide>
          <dl className="detail-list">
            <div><dt>Patient</dt><dd>{fullName(record.patient)}</dd></div>
            <div><dt>Doctor</dt><dd>Dr. {fullName(record.doctor)} · {record.doctor?.specialty}</dd></div>
            <div><dt>Notes</dt><dd>{record.notes}</dd></div>
            <div><dt>Allergies</dt><dd>{record.allergies || '—'}</dd></div>
            <div><dt>Treatment plan</dt><dd>{record.treatmentPlan || '—'}</dd></div>
          </dl>
        </Modal>
      )}
      {mode === 'edit' && <RecordModal record={record} onClose={() => setMode(null)} onSaved={() => { setMode(null); refresh(); }} />}
    </>
  );
}

function RecordModal({ record, onClose, onSaved }: { record: MedicalRecord | null; onClose: () => void; onSaved: () => void }) {
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
      {!record && <ComboboxField label="Patient" name="patientId" required placeholder="Search by name, email, phone or ID" fetchOptions={fetchPatientOptions} />}
      <Field label="Diagnosis" name="diagnosis" required defaultValue={record?.diagnosis} />
      <TextArea label="Clinical notes" name="notes" required rows={5} defaultValue={record?.notes} />
      <TextArea label="Allergies" name="allergies" rows={2} defaultValue={record?.allergies} />
      <TextArea label="Treatment plan" name="treatmentPlan" rows={3} defaultValue={record?.treatmentPlan} />
      <ModalActions onCancel={onClose} submitLabel="Save record" busy={busy} />
    </Modal>
  );
}
