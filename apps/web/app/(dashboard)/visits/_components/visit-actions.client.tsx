'use client';
import { useState } from 'react';
import { api } from '@/lib/api-client';
import { ComboboxField } from '@/components/ui/ComboboxField';
import { fetchDoctorOptions, fetchPatientOptions } from '@/lib/option-fetchers';
import { useRefreshAction } from '@/lib/use-action';

export function CreateVisitForm() {
  const { run, error } = useRefreshAction();
  const [patientId, setPatientId] = useState('');
  const [doctorId, setDoctorId] = useState('');
  const [appointmentId, setAppointmentId] = useState('');
  const [source, setSource] = useState('WALK_IN');
  const [priority, setPriority] = useState('NORMAL');
  const [localError, setLocalError] = useState('');
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLocalError('');
    await run(async () => api('/visits', { method: 'POST', body: { patientId, source, doctorId: doctorId || undefined, appointmentId: appointmentId || undefined, priority } }));
  }
  return <form className="operation-form" onSubmit={submit}>
    <ComboboxField label="Patient" name="patientId" required placeholder="Search patient by name or phone" fetchOptions={fetchPatientOptions} onValueChange={setPatientId} />
    <label>Visit source<select value={source} onChange={(e) => setSource(e.target.value)}><option value="WALK_IN">Walk in</option><option value="APPOINTMENT">Appointment</option><option value="REFERRAL">Referral</option><option value="EMERGENCY">Emergency</option></select></label>
    <ComboboxField label="Doctor (optional)" name="doctorId" placeholder="Assign a doctor" fetchOptions={fetchDoctorOptions} onValueChange={setDoctorId} />
    <label>Appointment ID (optional)<input value={appointmentId} onChange={(e) => setAppointmentId(e.target.value)} /></label>
    <label>Priority<select value={priority} onChange={(e) => setPriority(e.target.value)}><option value="NORMAL">Normal</option><option value="URGENT">Urgent</option></select></label>
    <button className="btn primary" type="submit">Register visit</button>
    {(error || localError) && <p role="alert" className="form-error">{error || localError}</p>}
  </form>;
}

export function VisitStatusAction({ id, status, role }: { id: string; status: string; role: string }) {
  const { run, error } = useRefreshAction();
  const next = role === 'ADMIN' ? (status === 'WAITING' ? 'IN_TRIAGE' : status === 'IN_TRIAGE' ? 'WITH_DOCTOR' : status === 'WITH_DOCTOR' ? 'AWAITING_SERVICES' : status === 'AWAITING_SERVICES' ? 'COMPLETED' : null) : role === 'NURSE' && status === 'WAITING' ? 'IN_TRIAGE' : role === 'DOCTOR' && status === 'IN_TRIAGE' ? 'WITH_DOCTOR' : role === 'DOCTOR' && status === 'WITH_DOCTOR' ? 'AWAITING_SERVICES' : role === 'DOCTOR' && status === 'AWAITING_SERVICES' ? 'COMPLETED' : null;
  if (!next) return null;
  return <div><button className="btn secondary small" onClick={() => void run(() => api(`/visits/${id}/status`, { method: 'PATCH', body: { status: next } }))}>Move to {next.replaceAll('_', ' ').toLowerCase()}</button>{error && <small role="alert">{error}</small>}</div>;
}

export function TriageForm({visitId}:{visitId:string}) {
  const {run,error}=useRefreshAction(); const [chiefComplaint,setChiefComplaint]=useState(''); const [temperatureC,setTemperatureC]=useState(''); const [pulseBpm,setPulseBpm]=useState(''); const [respiratoryRate,setRespiratoryRate]=useState(''); const [systolicBp,setSystolicBp]=useState(''); const [diastolicBp,setDiastolicBp]=useState(''); const [spo2,setSpo2]=useState(''); const [weightKg,setWeightKg]=useState(''); const [heightCm,setHeightCm]=useState(''); const [priority,setPriority]=useState('NORMAL');
  const numberOrUndefined=(value:string)=>value===''?undefined:Number(value);
  return <details><summary>Record triage</summary><form className="operation-form" onSubmit={(e)=>{e.preventDefault();void run(()=>api(`/visits/${visitId}/triage`,{method:'POST',body:{chiefComplaint,temperatureC:numberOrUndefined(temperatureC),pulseBpm:numberOrUndefined(pulseBpm),respiratoryRate:numberOrUndefined(respiratoryRate),systolicBp:numberOrUndefined(systolicBp),diastolicBp:numberOrUndefined(diastolicBp),spo2:numberOrUndefined(spo2),weightKg:numberOrUndefined(weightKg),heightCm:numberOrUndefined(heightCm),priority}}));}}><label>Chief complaint<input required value={chiefComplaint} onChange={(e)=>setChiefComplaint(e.target.value)}/></label><label>Temperature °C<input type="number" step="0.1" value={temperatureC} onChange={(e)=>setTemperatureC(e.target.value)}/></label><label>Pulse bpm<input type="number" value={pulseBpm} onChange={(e)=>setPulseBpm(e.target.value)}/></label><label>Respiratory rate<input type="number" value={respiratoryRate} onChange={(e)=>setRespiratoryRate(e.target.value)}/></label><label>Systolic BP<input type="number" value={systolicBp} onChange={(e)=>setSystolicBp(e.target.value)}/></label><label>Diastolic BP<input type="number" value={diastolicBp} onChange={(e)=>setDiastolicBp(e.target.value)}/></label><label>SpO₂<input type="number" min="0" max="100" value={spo2} onChange={(e)=>setSpo2(e.target.value)}/></label><label>Weight kg<input type="number" step="0.1" value={weightKg} onChange={(e)=>setWeightKg(e.target.value)}/></label><label>Height cm<input type="number" step="0.1" value={heightCm} onChange={(e)=>setHeightCm(e.target.value)}/></label><label>Priority<select value={priority} onChange={(e)=>setPriority(e.target.value)}><option value="NORMAL">Normal</option><option value="URGENT">Urgent</option></select></label><button className="btn primary small">Save triage</button>{error&&<p role="alert" className="form-error">{error}</p>}</form></details>;
}
