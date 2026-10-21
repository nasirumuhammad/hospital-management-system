import type { Visit } from '@healthcare/types';
import { ListPanel, PageHeader } from '@/components/ui/Page';
import { serverApi } from '@/lib/server-api';
import { getSessionUser } from '@/lib/session';
import { CreateVisitForm, TriageForm, VisitStatusAction } from './_components/visit-actions.client';

export default async function VisitsPage() {
  const user = await getSessionUser();
  if (!user) return null;
  const visits = await serverApi<Visit[]>('/visits');
  return <>
    <PageHeader title="Visits & queue" description="Register arrivals and manage today's outpatient queue." />
    {['ADMIN','RECEPTIONIST','NURSE'].includes(user.role) && <ListPanel title="Register a visit" description="Use the patient UUID shown in the patient record."><CreateVisitForm /></ListPanel>}
    <ListPanel title="Today's queue" description={`${visits.length} visits · urgent cases are listed first`}>
      <div className="table-scroll"><table><thead><tr><th>Queue</th><th>Patient</th><th>Patient number</th><th>Source</th><th>Doctor</th><th>Priority</th><th>Status</th><th>Action</th></tr></thead><tbody>
        {visits.map((visit) => <tr key={visit.id}><td>{visit.visitNumber}</td><td>{[visit.firstName,visit.middleName,visit.lastName].filter(Boolean).join(' ')}</td><td>{visit.hospitalNumber}</td><td>{visit.source.replaceAll('_',' ')}</td><td>{visit.doctorFirstName ? `${visit.doctorFirstName} ${visit.doctorLastName ?? ''}` : 'Unassigned'}</td><td>{visit.priority}</td><td>{visit.status.replaceAll('_',' ')}</td><td>{['ADMIN','NURSE','DOCTOR'].includes(user.role) && ['WAITING','IN_TRIAGE'].includes(visit.status) && <TriageForm visitId={visit.id} />}<VisitStatusAction id={visit.id} status={visit.status} role={user.role} /></td></tr>)}
        {visits.length === 0 && <tr><td colSpan={8}>No visits registered today.</td></tr>}
      </tbody></table></div>
    </ListPanel>
  </>;
}
