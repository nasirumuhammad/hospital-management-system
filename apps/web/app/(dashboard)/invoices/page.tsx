'use client';
import { useEffect, useMemo, useState } from 'react';
import { INVOICE_STATUSES, PAYMENT_METHODS, type Invoice, type Patient } from '@healthcare/types';
import { useCurrentUser } from '@/components/auth/AuthProvider';
import { EmptyState, ErrorBanner } from '@/components/ui/Feedback';
import { Field, Select } from '@/components/ui/Fields';
import { Modal, ModalActions } from '@/components/ui/Modal';
import { Pagination } from '@/components/ui/Pagination';
import { ListPanel, PageHeader, PersonCell } from '@/components/ui/Page';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { api, errorMessage } from '@/lib/api-client';
import { formatDate, formatDateTime, formatMoney, fullName, titleCase } from '@/lib/format';
import { readForm } from '@/lib/form';
import { useList } from '@/lib/use-list';

const OPTION_LIMIT = 100;

export default function InvoicesPage() {
  const isAdmin = useCurrentUser().role === 'ADMIN';
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [creating, setCreating] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const query = useMemo(() => ({ page, limit: 15, status: status || undefined }), [page, status]);
  const list = useList<Invoice>('/invoices', query);

  return (
    <>
      <PageHeader title="Invoices" description="Billing and payments." actionLabel={isAdmin ? 'Create invoice' : undefined} onAction={() => setCreating(true)} />
      <ErrorBanner message={list.error} onDismiss={() => list.setError('')} />
      <ListPanel title="Invoices" description={`${list.data?.total ?? 0} invoices`} toolbar={
        <select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} aria-label="Filter by status">
          <option value="">All statuses</option>
          {INVOICE_STATUSES.map((value) => <option key={value} value={value}>{titleCase(value)}</option>)}
        </select>
      }>
        <div className="table-scroll">
          <table>
            <thead><tr><th>Patient</th><th>Description</th><th>Amount</th><th>Paid</th><th>Due</th><th>Status</th><th /></tr></thead>
            <tbody>
              {list.items.map((invoice) => (
                <tr key={invoice.id}>
                  <td><PersonCell name={fullName(invoice.patient)} tone="patient" /></td>
                  <td>{invoice.description}</td>
                  <td>{formatMoney(invoice.amount)}</td><td>{formatMoney(invoice.amountPaid)}</td>
                  <td>{invoice.dueDate ? formatDate(invoice.dueDate) : '—'}</td>
                  <td><StatusBadge value={invoice.status} /></td>
                  <td><button className="btn secondary small" onClick={() => setOpenId(invoice.id)}>Details</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          {list.items.length === 0 && <EmptyState loading={list.loading} label="invoices" />}
        </div>
        <Pagination data={list.data} onPage={setPage} />
      </ListPanel>
      {creating && <InvoiceModal onClose={() => setCreating(false)} onSaved={() => { setCreating(false); void list.reload(); }} />}
      {openId && <InvoiceDetailModal id={openId} onClose={() => setOpenId(null)} onChanged={() => void list.reload()} />}
    </>
  );
}

function InvoiceModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const patients = useList<Patient>('/patients', { limit: OPTION_LIMIT });
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
      <Select label="Patient" name="patientId" required placeholder="Select patient" options={patients.items.map((p) => ({ value: p.id, label: `${fullName(p)} · ${p.email}` }))} />
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
            <button className="btn danger small" disabled={busy} onClick={() => window.confirm('Void this invoice?') && void mutate(() => api<Invoice>(`/invoices/${id}/void`, { method: 'POST' }))}>Void invoice</button>
          )}
        </>
      )}
    </Modal>
  );
}
