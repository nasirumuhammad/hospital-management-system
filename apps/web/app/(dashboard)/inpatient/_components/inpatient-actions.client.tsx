'use client';
import { useState } from 'react';
import { api } from '@/lib/api-client';
import { useRefreshAction } from '@/lib/use-action';
import { ComboboxField } from '@/components/ui/ComboboxField';
import { fetchBedOptions, fetchVisitOptions } from '@/lib/option-fetchers';

export function CreateWardForm() {
  const {run,error}=useRefreshAction(); const [name,setName]=useState(''); const [wardType,setWardType]=useState('GENERAL');
  return <form className="operation-form" onSubmit={(e)=>{e.preventDefault();void run(()=>api('/inpatient/wards',{method:'POST',body:{name,wardType}}));}}><label>Ward name<input required value={name} onChange={(e)=>setName(e.target.value)}/></label><label>Ward type<input value={wardType} onChange={(e)=>setWardType(e.target.value)}/></label><button className="btn primary">Create ward</button>{error&&<p className="form-error" role="alert">{error}</p>}</form>;
}
export function CreateBedForm({wardId}:{wardId:string}) {
  const {run,error}=useRefreshAction(); const [bedNumber,setBedNumber]=useState('');
  return <form className="inline-operation-form" onSubmit={(e)=>{e.preventDefault();void run(()=>api(`/inpatient/wards/${wardId}/beds`,{method:'POST',body:{bedNumber}}));}}><input required aria-label="Bed number" value={bedNumber} onChange={(e)=>setBedNumber(e.target.value)} placeholder="Bed number"/><button className="btn secondary small">Add bed</button>{error&&<small role="alert">{error}</small>}</form>;
}
export function AdmissionForm() {
  const {run,error}=useRefreshAction(); const [visitId,setVisitId]=useState(''); const [bedId,setBedId]=useState(''); const [diagnosis,setDiagnosis]=useState('');
  return <form className="operation-form" onSubmit={(e)=>{e.preventDefault();void run(()=>api('/inpatient/admissions',{method:'POST',body:{visitId,bedId,diagnosis:diagnosis||undefined}}));}}><ComboboxField label="Visit" name="visitId" required placeholder="Search today's visits" fetchOptions={fetchVisitOptions} onValueChange={setVisitId}/><ComboboxField label="Available bed" name="bedId" required placeholder="Search beds by ward or number" fetchOptions={fetchBedOptions} onValueChange={setBedId}/><label>Diagnosis<input value={diagnosis} onChange={(e)=>setDiagnosis(e.target.value)}/></label><button className="btn primary">Admit patient</button>{error&&<p className="form-error" role="alert">{error}</p>}</form>;
}
