import type { Drug, PharmacyQueueItem } from '@healthcare/types';
import { ListPanel, PageHeader } from '@/components/ui/Page';
import { PriceForm } from '@/components/ui/PriceForm.client';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatMoney } from '@/lib/format';
import { serverApi } from '@/lib/server-api';
import { getSessionUser } from '@/lib/session';
import { CreateDrugForm, DispenseForm, GenerateInvoiceButton, ReceiveBatchForm } from './_components/pharmacy-actions.client';

const PHARMACY_STAFF = ['ADMIN', 'PHARMACIST'];

/** What the pharmacy does next for a prescription: bill it, wait for the cashier, or hand over the medicine. */
function QueueAction({ item }: { item: PharmacyQueueItem }) {
  if (item.status === 'PENDING') return item.drugId ? <GenerateInvoiceButton prescriptionId={item.id} /> : <small>Not from the catalogue: ask the doctor to re-prescribe</small>;
  if (item.status === 'AWAITING_PAYMENT') return <small>Waiting for the cashier · invoice {formatMoney(item.invoiceAmount ?? 0)}</small>;
  const remaining = (item.quantityPrescribed ?? 0) - item.quantityDispensed;
  return remaining > 0 ? <DispenseForm prescriptionId={item.id} remaining={remaining} /> : <small>Complete</small>;
}

export default async function PharmacyPage() {
  const user = await getSessionUser(); if (!user) return null;
  const isPharmacyStaff = PHARMACY_STAFF.includes(user.role);
  const [drugs, queue] = await Promise.all([
    serverApi<Drug[]>('/pharmacy/drugs'),
    isPharmacyStaff ? serverApi<PharmacyQueueItem[]>('/pharmacy/queue') : Promise.resolve([] as PharmacyQueueItem[]),
  ]);
  return <>
    <PageHeader title="Pharmacy & stock" description="Bill prescriptions, dispense once paid, and track expiry-aware stock." />
    {isPharmacyStaff && <ListPanel title="Prescription queue" description={`${queue.length} open prescriptions · generate the invoice, the patient pays at the cashier, then dispense`}>
      <div className="table-scroll"><table><thead><tr><th>Patient</th><th>Medicine</th><th>Quantity</th><th>Status</th><th>Action</th></tr></thead><tbody>
        {queue.map((item) => <tr key={item.id}><td>{item.firstName} {item.lastName}<small className="sub-cell">{item.hospitalNumber}</small></td><td>{item.medication}<small className="sub-cell">{item.dosage} · {item.frequency} · {item.duration}</small></td><td>{item.quantityDispensed} / {item.quantityPrescribed ?? '—'}</td><td><StatusBadge value={item.status} /></td><td><QueueAction item={item} /></td></tr>)}
        {queue.length === 0 && <tr><td colSpan={5}>No open prescriptions.</td></tr>}
      </tbody></table></div>
    </ListPanel>}
    {isPharmacyStaff && <ListPanel title="Add drug to catalogue" description="Stock quantities are received as batches below. Set a price so prescriptions can be invoiced."><CreateDrugForm /></ListPanel>}
    <ListPanel title="Drug inventory" description={`${drugs.length} active medicines`}>
      <div className="table-scroll"><table><thead><tr><th>Medicine</th><th>Brand</th><th>Form</th><th>Strength</th><th>Available stock</th><th>Reorder level</th><th>Price</th><th>Receive batch</th></tr></thead><tbody>
        {drugs.map((drug) => <tr key={drug.id}><td>{drug.genericName}</td><td>{drug.brandName || '—'}</td><td>{drug.form}</td><td>{drug.strength || '—'}</td><td>{drug.availableStock}</td><td>{drug.reorderLevel}</td><td>{isPharmacyStaff ? <PriceForm path={`/pharmacy/drugs/${drug.id}/price`} current={drug.unitPrice} /> : drug.unitPrice === null ? '—' : formatMoney(drug.unitPrice)}</td><td>{isPharmacyStaff ? <ReceiveBatchForm drugId={drug.id} /> : '—'}</td></tr>)}
        {drugs.length === 0 && <tr><td colSpan={8}>No medicines in the catalogue yet.</td></tr>}
      </tbody></table></div>
    </ListPanel>
  </>;
}
