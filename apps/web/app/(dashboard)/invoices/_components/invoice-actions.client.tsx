'use client';
import { Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { PAYMENT_METHODS, type Invoice } from '@healthcare/types';
import { useCurrentUser } from '@/components/auth/AuthProvider';
import { ComboboxField } from '@/components/ui/ComboboxField';
import { useConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ErrorBanner } from '@/components/ui/Feedback';
import { Field, Select } from '@/components/ui/Fields';
import { Modal, ModalActions } from '@/components/ui/Modal';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { api, errorMessage } from '@/lib/api-client';
import { formatDateTime, formatMoney, fullName, titleCase } from '@/lib/format';
import { readForm } from '@/lib/form';
import { fetchPatientOptions } from '@/lib/option-fetchers';
import { useRefreshAction } from '@/lib/use-action';

export function CreateInvoiceButton() {
  const [open, setOpen] = useState(false);
  const { refresh } = useRefreshAction();
  return (
    <>
      <button className="btn primary" onClick={() => setOpen(true)}><Plus size={17} /> Create invoice</button>
      {open && <InvoiceModal onClose={() => setOpen(false)} onSaved={() => { setOpen(false); refresh(); }} />}
    </>
  );
}

export function InvoiceDetailsButton({ id }: { id: string }) {
  const [open, setOpen] = useState(false);
  const { refresh } = useRefreshAction();
  return (
    <>
      <button className="btn secondary small" onClick={() => setOpen(true)}>Details</button>
      {open && <InvoiceDetailModal id={id} onClose={() => setOpen(false)} onChanged={refresh} />}
    </>
  );
}

function InvoiceModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const { amount, dueDate, ...rest } = readForm(event.currentTarget);
    setBusy(true);
    try {
      await api('/invoices', { method: 'POST', body: { ...rest, amount: Number(amount), dueDate: dueDate || undefined } });
      onSaved();
    } catch (failure) {
      setError(errorMessage(failure));
      setBusy(false);
    }
  }

  return (
    <Modal title="Create invoice" eyebrow="BILLING" onClose={onClose} onSubmit={submit}>
      <ErrorBanner message={error} />
      <ComboboxField label="Patient" name="patientId" required placeholder="Search by name, email, phone or ID" fetchOptions={fetchPatientOptions} />
      <Field label="Description" name="description" required />
      <div className="field-row">
        <Field label="Amount" name="amount" type="number" required min="0.01" step="0.01" />
        <Field label="Due date" name="dueDate" type="date" />
      </div>
      <ModalActions onCancel={onClose} submitLabel="Create invoice" busy={busy} />
    </Modal>
  );
}

function InvoiceDetailModal({ id, onClose, onChanged }: { id: string; onClose: () => void; onChanged: () => void }) {
  const isAdmin = useCurrentUser().role === 'ADMIN';
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const confirmAction = useConfirmDialog();

  useEffect(() => {
    api<Invoice>(`/invoices/${id}`).then(setInvoice).catch((failure) => setError(errorMessage(failure)));
  }, [id]);

  async function mutate(action: () => Promise<Invoice>) {
    setBusy(true);
    setError('');
    try {
      setInvoice(await action());
      onChanged();
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setBusy(false);
    }
  }

  async function voidInvoice() {
    const confirmed = await confirmAction({
      title: 'Void invoice',
      message: 'Void this invoice? It can no longer receive payments.',
      confirmLabel: 'Void invoice',
      tone: 'danger',
    });
    if (confirmed) await mutate(() => api<Invoice>(`/invoices/${id}/void`, { method: 'POST' }));
  }

  function recordPayment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const { amount, method, reference } = readForm(form);
    void mutate(() => api<Invoice>(`/invoices/${id}/payments`, { method: 'POST', body: { amount: Number(amount), method, reference: reference || undefined } })).then(() => form.reset());
  }

  const open = invoice && invoice.status !== 'VOID' && invoice.status !== 'PAID';
  return (
    <Modal title={invoice?.description ?? 'Invoice'} eyebrow="INVOICE" onClose={onClose} wide>
      <ErrorBanner message={error} />
      {invoice && (
        <>
          <dl className="detail-list">
            <div><dt>Patient</dt><dd>{fullName(invoice.patient)}</dd></div>
            <div><dt>Total / paid</dt><dd>{formatMoney(invoice.amount)} / {formatMoney(invoice.amountPaid)}</dd></div>
            <div><dt>Status</dt><dd><StatusBadge value={invoice.status} /></dd></div>
          </dl>
          <div className="table-scroll">
            <table>
              <thead><tr><th>Received</th><th>Method</th><th>Reference</th><th>Amount</th></tr></thead>
              <tbody>{invoice.payments?.map((payment) => (
                <tr key={payment.id}><td>{formatDateTime(payment.createdAt)}</td><td>{titleCase(payment.method)}</td><td>{payment.reference || '—'}</td><td>{formatMoney(payment.amount)}</td></tr>
              ))}</tbody>
            </table>
            {(invoice.payments?.length ?? 0) === 0 && <div className="empty-small">No payments recorded.</div>}
          </div>
          {isAdmin && open && (
            <form onSubmit={recordPayment} style={{ marginTop: 18 }}>
              <div className="field-row">
                <Field label="Payment amount" name="amount" type="number" required min="0.01" step="0.01" />
                <Select label="Method" name="method" required defaultValue="CASH" options={PAYMENT_METHODS.map((m) => ({ value: m, label: titleCase(m) }))} />
              </div>
              <Field label="Reference (optional)" name="reference" />
              <ModalActions onCancel={onClose} submitLabel="Record payment" busy={busy} />
            </form>
          )}
          {isAdmin && invoice.status === 'UNPAID' && (
            <button className="btn danger small" disabled={busy} onClick={() => void voidInvoice()}>Void invoice</button>
          )}
        </>
      )}
    </Modal>
  );
}
