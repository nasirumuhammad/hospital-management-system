import { AUDIT_TARGETS, type AuditLogEntry, type Paginated } from '@healthcare/types';
import { EmptyState } from '@/components/ui/Feedback';
import { LinkPagination } from '@/components/ui/LinkPagination';
import { ListPanel, PageHeader } from '@/components/ui/Page';
import { SelectFilter } from '@/components/ui/UrlFilters';
import { formatDateTime, titleCase } from '@/lib/format';
import { hrefBuilder, oneOf, pageNumber, type PageSearchParams } from '@/lib/search-params';
import { serverApi } from '@/lib/server-api';
import { getSessionUser } from '@/lib/session';

const PAGE_SIZE = 25;
const TARGET_OPTIONS = AUDIT_TARGETS.map((value) => ({ value, label: titleCase(value) }));

export default async function AuditLogsPage({ searchParams }: { searchParams: PageSearchParams }) {
  if (!(await getSessionUser())) return null;

  const params = await searchParams;
  const targetType = oneOf(params.targetType, AUDIT_TARGETS);
  const data = await serverApi<Paginated<AuditLogEntry>>('/audit-logs', { query: { page: pageNumber(params.page), limit: PAGE_SIZE, targetType } });

  return (
    <>
      <PageHeader title="Audit log" description="A record of sign-ins, account changes and clinical or billing activity." />
      <ListPanel title="Activity" description={`${data.total} events`}
        toolbar={<SelectFilter param="targetType" label="Filter by record type" allLabel="All record types" options={TARGET_OPTIONS} />}>
        <div className="table-scroll">
          <table>
            <thead><tr><th>When</th><th>Action</th><th>Record</th><th>Actor</th><th>Details</th></tr></thead>
            <tbody>
              {data.items.map((entry) => (
                <tr key={entry.id}>
                  <td>{formatDateTime(entry.createdAt)}</td>
                  <td><b>{titleCase(entry.action)}</b></td>
                  <td>{titleCase(entry.targetType)}<small className="sub-cell id-cell">{entry.targetId?.slice(0, 8) ?? '—'}</small></td>
                  <td className="id-cell">{entry.actorId?.slice(0, 8) ?? 'System'}</td>
                  <td className="id-cell">{entry.metadata ? JSON.stringify(entry.metadata) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.items.length === 0 && <EmptyState loading={false} label="events" />}
        </div>
        <LinkPagination data={data} hrefFor={hrefBuilder({ targetType })} />
      </ListPanel>
    </>
  );
}
