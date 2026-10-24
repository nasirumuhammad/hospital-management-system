import { STAFF_ROLES, type Paginated, type StaffMember } from '@healthcare/types';
import { ListPanel, PageHeader } from '@/components/ui/Page';
import { first, oneOf, tableQuery, type PageSearchParams } from '@/lib/search-params';
import { serverApi } from '@/lib/server-api';
import { AddStaffButton } from './_components/staff-actions.client';
import { StaffTable } from './_components/staff-table.client';
import { STAFF_DEFAULT_SORT, STAFF_SORTABLE } from './_components/staff-table.config';

export default async function StaffPage({ searchParams }: { searchParams: PageSearchParams }) {
  const params = await searchParams;
  const { page, limit, q, sort, apiSort } = tableQuery(params, { sortable: STAFF_SORTABLE, defaultSort: STAFF_DEFAULT_SORT });
  const role = oneOf(params.role, STAFF_ROLES);
  const includeInactive = first(params.includeInactive) === 'true';
  const data = await serverApi<Paginated<StaffMember>>('/staff', { query: { page, limit, q, role, includeInactive: includeInactive ? true : undefined, ...apiSort } });

  return (
    <>
      <PageHeader title="Staff" description="Nurses, cashiers, lab, pharmacy, ward and front-desk team. A staff record exists on its own; a login is optional and can be removed without losing it." extra={<AddStaffButton />} />
      <ListPanel title="Staff directory" description={`${data.total.toLocaleString('en-US')} staff members`}>
        <StaffTable data={data} sort={sort} />
      </ListPanel>
    </>
  );
}
