'use client';
import type { ColumnDef } from '@tanstack/react-table';
import { AUDIT_TARGETS, type AuditLogEntry, type Paginated } from '@healthcare/types';
import { DataTable } from '@/components/ui/DataTable';
import { formatDateTime, titleCase } from '@/lib/format';
import type { SortSpec } from '@/lib/search-params';
import { AUDIT_SORTABLE, AUDIT_DEFAULT_SORT, AUDIT_PAGE_SIZE } from './audit-table.config';

const TARGET_OPTIONS = AUDIT_TARGETS.map((value) => ({ value, label: titleCase(value) }));

export function AuditTable({ data, sort }: { data: Paginated<AuditLogEntry>; sort: SortSpec }) {
  const columns: ColumnDef<AuditLogEntry>[] = [
    { id: 'createdAt', header: 'When', enableSorting: true, enableHiding: false, cell: ({ row }) => formatDateTime(row.original.createdAt) },
    { id: 'action', header: 'Action', enableSorting: true, cell: ({ row }) => <b>{titleCase(row.original.action)}</b> },
    {
      id: 'targetType', header: 'Record', enableSorting: true,
      cell: ({ row }) => <>{titleCase(row.original.targetType)}<small className="sub-cell id-cell">{row.original.targetId?.slice(0, 8) ?? '—'}</small></>,
    },
    { id: 'actor', header: 'Actor', cell: ({ row }) => <span className="id-cell">{row.original.actorId?.slice(0, 8) ?? 'System'}</span> },
    { id: 'details', header: 'Details', cell: ({ row }) => <span className="id-cell">{row.original.metadata ? JSON.stringify(row.original.metadata) : '—'}</span> },
  ];
  return (
    <DataTable
      columns={columns} data={data} sort={sort} defaultSort={AUDIT_DEFAULT_SORT} defaultLimit={AUDIT_PAGE_SIZE} storageKey="audit-logs" getRowId={(row) => row.id}
      emptyLabel="events"
      filters={[{ type: 'select', param: 'targetType', label: 'Filter by record type', allLabel: 'All record types', options: TARGET_OPTIONS }]}
    />
  );
}
