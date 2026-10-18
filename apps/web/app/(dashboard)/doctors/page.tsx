import type { Doctor, Paginated } from '@healthcare/types';
import { EmptyState } from '@/components/ui/Feedback';
import { LinkPagination } from '@/components/ui/LinkPagination';
import { ListPanel, PageHeader, PersonCell } from '@/components/ui/Page';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { CheckboxFilter, SearchFilter } from '@/components/ui/UrlFilters';
import { fullName } from '@/lib/format';
import { DEFAULT_PAGE_SIZE, first, hrefBuilder, pageNumber, searchTerm, type PageSearchParams } from '@/lib/search-params';
import { serverApi } from '@/lib/server-api';
import { getSessionUser } from '@/lib/session';
import { AddDoctorButton, DoctorRowActions } from './_components/doctor-actions.client';

export default async function DoctorsPage({ searchParams }: { searchParams: PageSearchParams }) {
  const user = await getSessionUser();
  if (!user) return null;
  const isAdmin = user.role === 'ADMIN';

  const params = await searchParams;
  const q = searchTerm(params.q);
  const includeInactive = isAdmin && first(params.includeInactive) === 'true';
  const data = await serverApi<Paginated<Doctor>>('/doctors', {
    query: { page: pageNumber(params.page), limit: DEFAULT_PAGE_SIZE, q, includeInactive: includeInactive ? true : undefined },
  });

  return (
    <>
      <PageHeader title="Doctors" description="The medical team." extra={isAdmin && <AddDoctorButton />} />
      <ListPanel title="Medical team" description={`${data.total} doctors`} toolbar={<>
        {isAdmin && <CheckboxFilter param="includeInactive" label="Show inactive" />}
        <SearchFilter />
      </>}>
        <div className="table-scroll">
          <table>
            <thead><tr><th>Doctor</th><th>Specialty</th><th>Email address</th><th>Qualification</th><th>Status</th>{isAdmin && <th>Actions</th>}</tr></thead>
            <tbody>
              {data.items.map((doctor) => (
                <tr key={doctor.id}>
                  <td><PersonCell name={`Dr. ${fullName(doctor)}`} tone="doctor" /></td>
                  <td>{doctor.specialty}</td><td>{doctor.email}</td><td>{doctor.qualification || '—'}</td>
                  <td><StatusBadge value={doctor.isActive ? 'ACTIVE' : 'INACTIVE'} /></td>
                  {isAdmin && <td><DoctorRowActions doctor={doctor} /></td>}
                </tr>
              ))}
            </tbody>
          </table>
          {data.items.length === 0 && <EmptyState loading={false} label="doctors" />}
        </div>
        <LinkPagination data={data} hrefFor={hrefBuilder({ q, includeInactive: includeInactive ? 'true' : undefined })} />
      </ListPanel>
    </>
  );
}
