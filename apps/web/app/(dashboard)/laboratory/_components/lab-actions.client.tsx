'use client';
import { useState } from 'react';
import { api } from '@/lib/api-client';
import { useRefreshAction } from '@/lib/use-action';
import { ComboboxField } from '@/components/ui/ComboboxField';
import { fetchVisitOptions } from '@/lib/option-fetchers';

export function CreateLabOrderForm() {
  const { run, error } = useRefreshAction();
  const [visitId, setVisitId] = useState('');
  const [testIds, setTestIds] = useState('');
  const [clinicalNote, setClinicalNote] = useState('');
  return <form className="operation-form" onSubmit={(event) => { event.preventDefault(); void run(() => api('/lab/orders', { method: 'POST', body: { visitId, labTestIds: testIds.split(',').map((id) => id.trim()).filter(Boolean), clinicalNote: clinicalNote || undefined } })); }}>
    <ComboboxField label="Visit" name="visitId" required placeholder="Search today's visits" fetchOptions={fetchVisitOptions} onValueChange={setVisitId} />
    <label>Lab test IDs<input required value={testIds} onChange={(e) => setTestIds(e.target.value)} placeholder="Comma separated UUIDs" /></label>
    <label>Clinical note<input value={clinicalNote} onChange={(e) => setClinicalNote(e.target.value)} /></label>
    <button className="btn primary" type="submit">Create lab order</button>{error && <p role="alert" className="form-error">{error}</p>}
  </form>;
}

export function CreateLabTestForm() {
  const { run, error } = useRefreshAction(); const [code,setCode]=useState(''); const [name,setName]=useState(''); const [category,setCategory]=useState(''); const [specimen,setSpecimen]=useState('');
  return <form className="operation-form" onSubmit={(event)=>{event.preventDefault();void run(()=>api('/lab/tests',{method:'POST',body:{code,name,category,specimen:specimen||undefined}}));}}><label>Test code<input required value={code} onChange={(e)=>setCode(e.target.value)}/></label><label>Test name<input required value={name} onChange={(e)=>setName(e.target.value)}/></label><label>Category<input required value={category} onChange={(e)=>setCategory(e.target.value)}/></label><label>Specimen<input value={specimen} onChange={(e)=>setSpecimen(e.target.value)}/></label><button className="btn primary">Add test</button>{error&&<p role="alert" className="form-error">{error}</p>}</form>;
}

export function CollectSpecimenAction({ itemId }: { itemId: string }) {
  const { run, error } = useRefreshAction();
  return <div><button className="btn secondary small" onClick={()=>void run(()=>api(`/lab/order-items/${itemId}/collect`,{method:'POST'}))}>Mark collected</button>{error&&<small role="alert">{error}</small>}</div>;
}

export function RecordResultsForm({ itemId }: { itemId: string }) {
  const { run, error } = useRefreshAction();
  const [parameterName, setParameterName] = useState('');
  const [value, setValue] = useState('');
  const [unit, setUnit] = useState('');
  return <form className="inline-operation-form" onSubmit={(event) => { event.preventDefault(); void run(() => api(`/lab/order-items/${itemId}/results`, { method: 'POST', body: { results: [{ parameterName, value, unit: unit || undefined }] } })); }}>
    <input aria-label="Parameter name" required value={parameterName} onChange={(e) => setParameterName(e.target.value)} placeholder="Parameter" />
    <input aria-label="Result value" required value={value} onChange={(e) => setValue(e.target.value)} placeholder="Value" />
    <input aria-label="Unit" value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="Unit" />
    <button className="btn secondary small" type="submit">Save result</button>{error && <small role="alert">{error}</small>}
  </form>;
}

export function CreateLabParameterForm({ testId }: { testId: string }) {
  const {run,error}=useRefreshAction(); const [name,setName]=useState(''); const [unit,setUnit]=useState(''); const [sortOrder,setSortOrder]=useState('0');
  return <form className="inline-operation-form" onSubmit={(e)=>{e.preventDefault();void run(()=>api(`/lab/tests/${testId}/parameters`,{method:'POST',body:{name,unit:unit||undefined,sortOrder:Number(sortOrder)}}));}}><input required aria-label="Parameter name" value={name} onChange={(e)=>setName(e.target.value)} placeholder="Parameter name"/><input aria-label="Unit" value={unit} onChange={(e)=>setUnit(e.target.value)} placeholder="Unit"/><input aria-label="Sort order" type="number" min="0" value={sortOrder} onChange={(e)=>setSortOrder(e.target.value)}/><button className="btn secondary small">Add parameter</button>{error&&<small role="alert">{error}</small>}</form>;
}

export function CreateLabRangeForm({ parameterId }: { parameterId: string }) {
  const {run,error}=useRefreshAction(); const [sex,setSex]=useState(''); const [minAgeYears,setMinAgeYears]=useState(''); const [maxAgeYears,setMaxAgeYears]=useState(''); const [refLow,setRefLow]=useState(''); const [refHigh,setRefHigh]=useState('');
  return <form className="inline-operation-form" onSubmit={(e)=>{e.preventDefault();void run(()=>api(`/lab/parameters/${parameterId}/ranges`,{method:'POST',body:{sex:sex||undefined,minAgeYears:minAgeYears===''?undefined:Number(minAgeYears),maxAgeYears:maxAgeYears===''?undefined:Number(maxAgeYears),refLow:refLow===''?undefined:Number(refLow),refHigh:refHigh===''?undefined:Number(refHigh)}}));}}><select aria-label="Sex range" value={sex} onChange={(e)=>setSex(e.target.value)}><option value="">Any sex</option><option value="MALE">Male</option><option value="FEMALE">Female</option></select><input aria-label="Minimum age in years" type="number" min="0" max="130" value={minAgeYears} onChange={(e)=>setMinAgeYears(e.target.value)} placeholder="Min age"/><input aria-label="Maximum age in years" type="number" min="0" max="130" value={maxAgeYears} onChange={(e)=>setMaxAgeYears(e.target.value)} placeholder="Max age"/><input aria-label="Reference low" type="number" step="any" value={refLow} onChange={(e)=>setRefLow(e.target.value)} placeholder="Low"/><input aria-label="Reference high" type="number" step="any" value={refHigh} onChange={(e)=>setRefHigh(e.target.value)} placeholder="High"/><button className="btn secondary small">Add range</button>{error&&<small role="alert">{error}</small>}</form>;
}

/** Lab step 1: raise the invoice the patient takes to the cashier. */
export function GenerateLabInvoiceButton({ orderId }: { orderId: string }) {
  const { run, error } = useRefreshAction();
  return <div><button className="btn primary small" onClick={() => void run(() => api(`/lab/orders/${orderId}/invoice`, { method: 'POST' }))}>Generate invoice</button>{error && <small role="alert">{error}</small>}</div>;
}
