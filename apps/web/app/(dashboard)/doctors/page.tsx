import type { Doctor, Paginated } from '@healthcare/types';
import { ListPanel, PageHeader } from '@/components/ui/Page';
import { first, tableQuery, type PageSearchParams } from '@/lib/search-params';
import { serverApi } from '@/lib/server-api';
import { getSessionUser } from '@/lib/session';
import { AddDoctorButton } from './_components/doctor-actions.client';
import { DoctorsTable } from './_components/doctors-table.client';
import { DOCTOR_SORTABLE, DOCTOR_DEFAULT_SORT } from './_components/doctors-table.config';

export default async function DoctorsPage({ searchParams }: { searchParams: PageSearchParams }) {
  const user = await getSessionUser();
  if (!user) return null;
  const isAdmin = user.role === 'ADMIN';

  const params = await searchParams;
  const { page, limit, q, sort, apiSort } = tableQuery(params, { sortable: DOCTOR_SORTABLE, defaultSort: DOCTOR_DEFAULT_SORT });
  const includeInactive = isAdmin && first(params.includeInactive) === 'true';
  const data = await serverApi<Paginated<Doctor>>('/doctors', { query: { page, limit, q, includeInactive: includeInactive ? true : undefined, ...apiSort } });

  return (
    <>
      <PageHeader title="Doctors" description="The medical team." extra={isAdmin && <AddDoctorButton />} />
      <ListPanel title="Medical team" description={`${data.total.toLocaleString('en-US')} doctors`}>
        <DoctorsTable data={data} sort={sort} isAdmin={isAdmin} />
      </ListPanel>
    </>
  );
}
