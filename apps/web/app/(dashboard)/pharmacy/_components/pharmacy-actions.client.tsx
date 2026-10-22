'use client';
import { useState } from 'react';
import { api } from '@/lib/api-client';
import { useRefreshAction } from '@/lib/use-action';

export function CreateDrugForm() {
  const { run, error } = useRefreshAction();
  const [genericName,setGenericName] = useState(''); const [brandName,setBrandName] = useState(''); const [form,setForm] = useState('TABLET'); const [strength,setStrength] = useState(''); const [dispensingUnit,setDispensingUnit] = useState('tablet'); const [reorderLevel,setReorderLevel] = useState('0');
  return <form className="operation-form" onSubmit={(e) => { e.preventDefault(); void run(() => api('/pharmacy/drugs',{method:'POST',body:{genericName,brandName:brandName||undefined,form,strength:strength||undefined,dispensingUnit,reorderLevel:Number(reorderLevel)}})); }}>
    <label>Generic name<input required value={genericName} onChange={(e)=>setGenericName(e.target.value)} /></label><label>Brand name<input value={brandName} onChange={(e)=>setBrandName(e.target.value)} /></label>
    <label>Form<select value={form} onChange={(e)=>setForm(e.target.value)}>{['TABLET','CAPSULE','SYRUP','INJECTION','CREAM','OTHER'].map((x)=><option key={x}>{x}</option>)}</select></label>
    <label>Strength<input value={strength} onChange={(e)=>setStrength(e.target.value)} placeholder="e.g. 500 mg" /></label><label>Dispensing unit<input required value={dispensingUnit} onChange={(e)=>setDispensingUnit(e.target.value)} /></label><label>Reorder level<input type="number" min="0" value={reorderLevel} onChange={(e)=>setReorderLevel(e.target.value)} /></label>
    <button className="btn primary" type="submit">Add drug</button>{error && <p role="alert" className="form-error">{error}</p>}
  </form>;
}

export function ReceiveBatchForm({ drugId }: { drugId: string }) {
  const { run, error } = useRefreshAction(); const [batchNumber,setBatchNumber]=useState(''); const [expiryDate,setExpiryDate]=useState(''); const [quantityReceived,setQuantityReceived]=useState(''); const [supplier,setSupplier]=useState('');
  return <form className="inline-operation-form" onSubmit={(e)=>{e.preventDefault();void run(()=>api(`/pharmacy/drugs/${drugId}/batches`,{method:'POST',body:{batchNumber,expiryDate,quantityReceived:Number(quantityReceived),supplier:supplier||undefined}}));}}>
    <input required aria-label="Batch number" value={batchNumber} onChange={(e)=>setBatchNumber(e.target.value)} placeholder="Batch number"/><input required aria-label="Expiry date" type="date" value={expiryDate} onChange={(e)=>setExpiryDate(e.target.value)}/><input required aria-label="Quantity received" type="number" min="1" value={quantityReceived} onChange={(e)=>setQuantityReceived(e.target.value)} placeholder="Quantity"/><input aria-label="Supplier" value={supplier} onChange={(e)=>setSupplier(e.target.value)} placeholder="Supplier"/><button className="btn secondary small" type="submit">Receive stock</button>{error&&<small role="alert">{error}</small>}
  </form>;
}

/** Pharmacy step 1: raise the invoice the patient takes to the cashier. */
export function GenerateInvoiceButton({ prescriptionId }: { prescriptionId: string }) {
  const { run, error } = useRefreshAction();
  return <div><button className="btn primary small" onClick={() => void run(() => api(`/pharmacy/prescriptions/${prescriptionId}/invoice`, { method: 'POST' }))}>Generate invoice</button>{error && <small role="alert">{error}</small>}</div>;
}

/** Pharmacy step 2: hand over the medicine once the cashier has been paid. */
export function DispenseForm({ prescriptionId, remaining }: { prescriptionId: string; remaining: number }) {
  const { run, error } = useRefreshAction();
  const [quantity, setQuantity] = useState(String(remaining));
  return (
    <form className="inline-operation-form" onSubmit={(event) => { event.preventDefault(); void run(() => api(`/pharmacy/prescriptions/${prescriptionId}/dispense`, { method: 'POST', body: { quantity: Number(quantity) } })); }}>
      <input required aria-label="Quantity to dispense" type="number" min="1" max={remaining} value={quantity} onChange={(event) => setQuantity(event.target.value)} />
      <button className="btn primary small" type="submit">Dispense</button>
      {error && <small role="alert">{error}</small>}
    </form>
  );
}
