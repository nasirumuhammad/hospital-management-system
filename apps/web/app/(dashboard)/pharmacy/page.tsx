import type { Drug } from '@healthcare/types';
import { ListPanel, PageHeader } from '@/components/ui/Page';
import { serverApi } from '@/lib/server-api';
import { getSessionUser } from '@/lib/session';
import { CreateDrugForm, ReceiveBatchForm } from './_components/pharmacy-actions.client';

export default async function PharmacyPage() {
  const user = await getSessionUser(); if (!user) return null;
  const drugs = await serverApi<Drug[]>('/pharmacy/drugs');
  return <>
    <PageHeader title="Pharmacy & stock" description="Track medicine catalogue, batches and expiry-aware stock." />
    {['ADMIN','PHARMACIST'].includes(user.role) && <ListPanel title="Add drug to catalogue" description="Stock quantities are received as batches below."><CreateDrugForm /></ListPanel>}
    <ListPanel title="Drug inventory" description={`${drugs.length} active medicines`}>
      <div className="table-scroll"><table><thead><tr><th>Medicine</th><th>Brand</th><th>Form</th><th>Strength</th><th>Available stock</th><th>Reorder level</th><th>Receive batch</th></tr></thead><tbody>
        {drugs.map((drug)=><tr key={drug.id}><td>{drug.genericName}</td><td>{drug.brandName||'—'}</td><td>{drug.form}</td><td>{drug.strength||'—'}</td><td>{drug.availableStock}</td><td>{drug.reorderLevel}</td><td>{['ADMIN','PHARMACIST'].includes(user.role)?<ReceiveBatchForm drugId={drug.id}/>: '—'}</td></tr>)}
        {drugs.length===0&&<tr><td colSpan={7}>No medicines in the catalogue yet.</td></tr>}
      </tbody></table></div>
    </ListPanel>
  </>;
}
