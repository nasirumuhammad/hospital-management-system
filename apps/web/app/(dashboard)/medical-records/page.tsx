import type { MedicalRecord, Paginated } from '@healthcare/types';
import { ListPanel, PageHeader } from '@/components/ui/Page';
import { tableQuery, type PageSearchParams } from '@/lib/search-params';
import { serverApi } from '@/lib/server-api';
import { getSessionUser } from '@/lib/session';
import { NewRecordButton } from './_components/record-actions.client';
import { RecordsTable } from './_components/records-table.client';
import { RECORD_SORTABLE, RECORD_DEFAULT_SORT } from './_components/records-table.config';

export default async function MedicalRecordsPage({ searchParams }: { searchParams: PageSearchParams }) {
  const user = await getSessionUser();
  if (!user) return null;
  const isDoctor = user.role === 'DOCTOR';

  const params = await searchParams;
  const { page, limit, q, sort, apiSort } = tableQuery(params, { sortable: RECORD_SORTABLE, defaultSort: RECORD_DEFAULT_SORT });
  const data = await serverApi<Paginated<MedicalRecord>>('/medical-records', { query: { page, limit, q, ...apiSort } });

  return (
    <>
      <PageHeader title="Medical records" description="Clinical notes and treatment plans." extra={isDoctor && <NewRecordButton />} />
      <ListPanel title="Records" description={`${data.total.toLocaleString('en-US')} records you have access to`}>
        <RecordsTable data={data} sort={sort} canEdit={isDoctor} />
      </ListPanel>
    </>
  );
}
