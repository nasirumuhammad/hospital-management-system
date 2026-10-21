import type { LabOrder } from '@healthcare/types';
import { ListPanel, PageHeader } from '@/components/ui/Page';
import { serverApi } from '@/lib/server-api';
import { getSessionUser } from '@/lib/session';
import { CollectSpecimenAction, CreateLabOrderForm, CreateLabParameterForm, CreateLabRangeForm, CreateLabTestForm, RecordResultsForm } from './_components/lab-actions.client';

type LabTest = { id: string; code: string; name: string; category: string; specimen: string | null; parameters: { id: string; name: string; unit: string | null; sortOrder: number }[] };

export default async function LaboratoryPage() {
  const user = await getSessionUser(); if (!user) return null;
  const [orders, tests] = await Promise.all([serverApi<LabOrder[]>('/lab/orders'), serverApi<LabTest[]>('/lab/tests')]);
  return <>
    <PageHeader title="Laboratory" description="Manage orders, result entry and laboratory turnaround." />
    {['ADMIN','LAB'].includes(user.role) && <ListPanel title="Test catalogue" description="Add the test catalogue before clinicians can order tests."><CreateLabTestForm /></ListPanel>}
    <ListPanel title="Test catalogue" description="Copy test IDs when creating an order. Reference ranges must be verified by a qualified lab scientist."><div className="table-scroll"><table><thead><tr><th>Code</th><th>Test</th><th>Category</th><th>Specimen</th><th>Test ID</th><th>Parameters / reference ranges</th></tr></thead><tbody>{tests.map((test)=><tr key={test.id}><td>{test.code}</td><td>{test.name}</td><td>{test.category}</td><td>{test.specimen||'—'}</td><td><code>{test.id}</code></td><td><div>{test.parameters.map((p)=><div key={p.id} style={{marginBottom:8}}><b>{p.name}</b>{p.unit?` (${p.unit})`:''}<CreateLabRangeForm parameterId={p.id}/></div>)}<CreateLabParameterForm testId={test.id}/></div></td></tr>)}{tests.length===0&&<tr><td colSpan={6}>No tests configured. Add tests above, then add parameters and reference ranges through the API.</td></tr>}</tbody></table></div></ListPanel>
    {['ADMIN','DOCTOR'].includes(user.role) && <ListPanel title="New lab order" description="Order tests against a registered visit."><CreateLabOrderForm /></ListPanel>}
    <ListPanel title="Lab orders" description={`${orders.length} orders in this hospital`}>
      <div className="table-scroll"><table><thead><tr><th>Ordered</th><th>Patient</th><th>Patient number</th><th>Test</th><th>Status</th><th>Record result / report</th></tr></thead><tbody>
        {orders.flatMap((order) => order.items.map((item) => <tr key={item.id}><td>{new Date(order.orderedAt).toLocaleString()}</td><td>{order.firstName} {order.lastName}</td><td>{order.hospitalNumber}</td><td>{item.testName}</td><td>{item.status}</td><td>{['ADMIN','LAB'].includes(user.role) && item.status === 'ORDERED' ? <CollectSpecimenAction itemId={item.id} /> : ['ADMIN','LAB'].includes(user.role) && item.status === 'COLLECTED' ? <RecordResultsForm itemId={item.id} /> : item.status === 'RESULTED' ? <a className="btn secondary small" href={`/print/lab-report/${item.id}`} target="_blank" rel="noreferrer">Print report</a> : '—'}</td></tr>))}
        {orders.length === 0 && <tr><td colSpan={6}>No lab orders yet.</td></tr>}
      </tbody></table></div>
    </ListPanel>
  </>;
}
