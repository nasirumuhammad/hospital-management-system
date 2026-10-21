import { AUDIT_TARGETS, type AuditLogEntry, type Paginated } from '@healthcare/types';
import { ListPanel, PageHeader } from '@/components/ui/Page';
import { oneOf, tableQuery, type PageSearchParams } from '@/lib/search-params';
import { serverApi } from '@/lib/server-api';
import { getSessionUser } from '@/lib/session';
import { AuditTable } from './_components/audit-table.client';
import { AUDIT_SORTABLE, AUDIT_DEFAULT_SORT, AUDIT_PAGE_SIZE } from './_components/audit-table.config';

export default async function AuditLogsPage({ searchParams }: { searchParams: PageSearchParams }) {
  if (!(await getSessionUser())) return null;

  const params = await searchParams;
  const { page, limit, sort, apiSort } = tableQuery(params, { sortable: AUDIT_SORTABLE, defaultSort: AUDIT_DEFAULT_SORT, defaultLimit: AUDIT_PAGE_SIZE });
  const targetType = oneOf(params.targetType, AUDIT_TARGETS);
  const data = await serverApi<Paginated<AuditLogEntry>>('/audit-logs', { query: { page, limit, targetType, ...apiSort } });

  return (
    <>
      <PageHeader title="Audit log" description="A record of sign-ins, account changes and clinical or billing activity." />
      <ListPanel title="Activity" description={`${data.total.toLocaleString('en-US')} events`}>
        <AuditTable data={data} sort={sort} />
      </ListPanel>
    </>
  );
}
