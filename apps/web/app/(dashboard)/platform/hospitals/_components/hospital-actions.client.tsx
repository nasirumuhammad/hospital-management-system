'use client';
import { useState } from 'react';
import { api } from '@/lib/api-client';
import { useRefreshAction } from '@/lib/use-action';

export function CreateHospitalForm() {
  const {run,error}=useRefreshAction();
  const [name,setName]=useState(''); const [slug,setSlug]=useState(''); const [phone,setPhone]=useState(''); const [address,setAddress]=useState(''); const [prefix,setPrefix]=useState('CP'); const [adminEmail,setAdminEmail]=useState(''); const [adminName,setAdminName]=useState(''); const [adminPassword,setAdminPassword]=useState('');
  return <form className="operation-form" onSubmit={(e)=>{e.preventDefault();void run(()=>api('/platform/hospitals',{method:'POST',body:{name,slug,phone:phone||undefined,address:address||undefined,patientNumberPrefix:prefix,adminEmail,adminName,adminPassword}}));setAdminPassword('');}}>
    <label>Hospital name<input required maxLength={150} value={name} onChange={(e)=>setName(e.target.value)}/></label><label>URL slug<input required pattern="[a-z0-9]+(-[a-z0-9]+)*" value={slug} onChange={(e)=>setSlug(e.target.value)} placeholder="green-valley-hospital"/></label><label>Patient number prefix<input required maxLength={10} value={prefix} onChange={(e)=>setPrefix(e.target.value.toUpperCase())}/></label><label>Phone<input value={phone} onChange={(e)=>setPhone(e.target.value)}/></label><label>Address<input value={address} onChange={(e)=>setAddress(e.target.value)}/></label><label>Administrator name<input required value={adminName} onChange={(e)=>setAdminName(e.target.value)}/></label><label>Administrator email<input required type="email" value={adminEmail} onChange={(e)=>setAdminEmail(e.target.value)}/></label><label>Temporary password<input required type="password" minLength={12} value={adminPassword} onChange={(e)=>setAdminPassword(e.target.value)}/></label><button className="btn primary">Create hospital</button>{error&&<p role="alert" className="form-error">{error}</p>}</form>;
}
export function HospitalStatusAction({id,isActive}:{id:string;isActive:boolean}){const {run,error}=useRefreshAction();return <div><button className="btn secondary small" onClick={()=>void run(()=>api(`/platform/hospitals/${id}/status`,{method:'PATCH',body:{isActive:!isActive}}))}>{isActive?'Suspend':'Reactivate'}</button>{error&&<small role="alert">{error}</small>}</div>}
