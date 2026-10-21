import type { Paginated, Prescription } from '@healthcare/types';
import { ListPanel, PageHeader } from '@/components/ui/Page';
import { tableQuery, type PageSearchParams } from '@/lib/search-params';
import { serverApi } from '@/lib/server-api';
import { getSessionUser } from '@/lib/session';
import { NewPrescriptionButton } from './_components/new-prescription.client';
import { PrescriptionsTable } from './_components/prescriptions-table.client';
import { PRESCRIPTION_SORTABLE, PRESCRIPTION_DEFAULT_SORT } from './_components/prescriptions-table.config';

export default async function PrescriptionsPage({ searchParams }: { searchParams: PageSearchParams }) {
  const user = await getSessionUser();
  if (!user) return null;

  const params = await searchParams;
  const { page, limit, q, sort, apiSort } = tableQuery(params, { sortable: PRESCRIPTION_SORTABLE, defaultSort: PRESCRIPTION_DEFAULT_SORT });
  const data = await serverApi<Paginated<Prescription>>('/prescriptions', { query: { page, limit, q, ...apiSort } });

  return (
    <>
      <PageHeader title="Prescriptions" description="Medication orders." extra={user.role === 'DOCTOR' && <NewPrescriptionButton />} />
      <ListPanel title="Prescriptions" description={`${data.total.toLocaleString('en-US')} prescriptions`}>
        <PrescriptionsTable data={data} sort={sort} />
      </ListPanel>
    </>
  );
}
