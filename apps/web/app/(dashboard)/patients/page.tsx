import { GENDERS, type Paginated, type Patient } from '@healthcare/types';
import { ListPanel, PageHeader } from '@/components/ui/Page';
import { oneOf, tableQuery, type PageSearchParams } from '@/lib/search-params';
import { serverApi } from '@/lib/server-api';
import { getSessionUser } from '@/lib/session';
import { AddPatientButton } from './_components/patient-actions.client';
import { PatientsTable } from './_components/patients-table.client';
import { PATIENT_SORTABLE, PATIENT_DEFAULT_SORT } from './_components/patients-table.config';

export default async function PatientsPage({ searchParams }: { searchParams: PageSearchParams }) {
  const user = await getSessionUser();
  if (!user) return null;
  const isAdmin = user.role === 'ADMIN';
  const canRegister = ['ADMIN', 'RECEPTIONIST'].includes(user.role);

  const params = await searchParams;
  const { page, limit, q, sort, apiSort } = tableQuery(params, { sortable: PATIENT_SORTABLE, defaultSort: PATIENT_DEFAULT_SORT });
  const gender = oneOf(params.gender, GENDERS);
  const data = await serverApi<Paginated<Patient>>('/patients', { query: { page, limit, q, gender, ...apiSort } });

  return (
    <>
      <PageHeader title="Patients" description="Manage the patient directory." extra={canRegister && <AddPatientButton />} />
      <ListPanel title="Patient directory" description={`${data.total.toLocaleString('en-US')} registered patients`}>
        <PatientsTable data={data} sort={sort} isAdmin={isAdmin} />
      </ListPanel>
    </>
  );
}
