import type { Paginated, Patient } from '@healthcare/types';
import { EmptyState } from '@/components/ui/Feedback';
import { LinkPagination } from '@/components/ui/LinkPagination';
import { ListPanel, PageHeader, PersonCell } from '@/components/ui/Page';
import { SearchFilter } from '@/components/ui/UrlFilters';
import { fullName } from '@/lib/format';
import { DEFAULT_PAGE_SIZE, hrefBuilder, pageNumber, searchTerm, type PageSearchParams } from '@/lib/search-params';
import { serverApi } from '@/lib/server-api';
import { getSessionUser } from '@/lib/session';
import { AddPatientButton, PatientRowActions } from './_components/patient-actions.client';

export default async function PatientsPage({ searchParams }: { searchParams: PageSearchParams }) {
  const user = await getSessionUser();
  if (!user) return null;
  const isAdmin = user.role === 'ADMIN';

  const params = await searchParams;
  const q = searchTerm(params.q);
  const data = await serverApi<Paginated<Patient>>('/patients', { query: { page: pageNumber(params.page), limit: DEFAULT_PAGE_SIZE, q } });

  return (
    <>
      <PageHeader title="Patients" description="Manage the patient directory." extra={isAdmin && <AddPatientButton />} />
      <ListPanel title="Patient directory" description={`${data.total} registered patients`} toolbar={<SearchFilter />}>
        <div className="table-scroll">
          <table>
            <thead><tr><th>Patient</th><th>Email address</th><th>Phone</th><th>Gender</th><th>Date of birth</th>{isAdmin && <th>Actions</th>}</tr></thead>
            <tbody>
              {data.items.map((patient) => (
                <tr key={patient.id}>
                  <td><PersonCell name={fullName(patient)} tone="patient" /></td>
                  <td>{patient.email}</td><td>{patient.phone || '—'}</td><td>{patient.gender || '—'}</td><td>{patient.dateOfBirth || '—'}</td>
                  {isAdmin && <td><PatientRowActions patient={patient} /></td>}
                </tr>
              ))}
            </tbody>
          </table>
          {data.items.length === 0 && <EmptyState loading={false} label="patients" />}
        </div>
        <LinkPagination data={data} hrefFor={hrefBuilder({ q })} />
      </ListPanel>
    </>
  );
}
