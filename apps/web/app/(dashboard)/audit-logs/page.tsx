'use client';
import { useMemo, useState } from 'react';
import { AUDIT_TARGETS, type AuditLogEntry } from '@healthcare/types';
import { EmptyState, ErrorBanner } from '@/components/ui/Feedback';
import { Pagination } from '@/components/ui/Pagination';
import { ListPanel, PageHeader } from '@/components/ui/Page';
import { formatDateTime, titleCase } from '@/lib/format';
import { useList } from '@/lib/use-list';

export default function AuditLogsPage() {
  const [page, setPage] = useState(1);
  const [targetType, setTargetType] = useState('');
  const query = useMemo(() => ({ page, limit: 25, targetType: targetType || undefined }), [page, targetType]);
  const list = useList<AuditLogEntry>('/audit-logs', query);

  return (
    <>
      <PageHeader title="Audit log" description="A record of sign-ins, account changes and clinical or billing activity." />
      <ErrorBanner message={list.error} onDismiss={() => list.setError('')} />
      <ListPanel title="Activity" description={`${list.data?.total ?? 0} events`} toolbar={
        <select value={targetType} onChange={(event) => { setTargetType(event.target.value); setPage(1); }} aria-label="Filter by record type">
          <option value="">All record types</option>
          {AUDIT_TARGETS.map((value) => <option key={value} value={value}>{titleCase(value)}</option>)}
        </select>
      }>
        <div className="table-scroll">
          <table>
            <thead><tr><th>When</th><th>Action</th><th>Record</th><th>Actor</th><th>Details</th></tr></thead>
            <tbody>
              {list.items.map((entry) => (
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
          {list.items.length === 0 && <EmptyState loading={list.loading} label="events" />}
        </div>
        <Pagination data={list.data} onPage={setPage} />
      </ListPanel>
    </>
  );
}
