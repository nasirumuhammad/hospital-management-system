'use client';
import type { ColumnDef } from '@tanstack/react-table';
import { USER_ROLES, type Paginated, type SessionUser } from '@healthcare/types';
import { DataTable } from '@/components/ui/DataTable';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatDate, titleCase } from '@/lib/format';
import type { SortSpec } from '@/lib/search-params';
import { AccountRowActions } from './account-actions.client';
import { ACCOUNT_SORTABLE, ACCOUNT_DEFAULT_SORT } from './accounts-table.config';

const ROLE_OPTIONS = USER_ROLES.map((value) => ({ value, label: titleCase(value) }));

export function AccountsTable({ data, sort, selfId }: { data: Paginated<SessionUser>; sort: SortSpec; selfId: string }) {
  const columns: ColumnDef<SessionUser>[] = [
    { id: 'name', header: 'Name', enableSorting: true, enableHiding: false, cell: ({ row }) => <b>{row.original.name}</b> },
    { id: 'email', header: 'Email address', enableSorting: true, cell: ({ row }) => row.original.email },
    { id: 'role', header: 'Role', enableSorting: true, cell: ({ row }) => <StatusBadge value={row.original.role} /> },
    { id: 'emailVerified', header: 'Email', enableSorting: true, cell: ({ row }) => (row.original.emailVerified ? 'Verified' : 'Unverified') },
    { id: 'status', header: 'Status', enableSorting: true, cell: ({ row }) => <StatusBadge value={row.original.isActive ? 'ACTIVE' : 'DISABLED'} /> },
    { id: 'createdAt', header: 'Created', enableSorting: true, cell: ({ row }) => formatDate(row.original.createdAt) },
    { id: 'actions', header: 'Actions', enableHiding: false, cell: ({ row }) => <AccountRowActions account={row.original} isSelf={row.original.id === selfId} /> },
  ];
  return (
    <DataTable
      columns={columns} data={data} sort={sort} defaultSort={ACCOUNT_DEFAULT_SORT} storageKey="accounts" getRowId={(row) => row.id}
      emptyLabel="accounts" searchPlaceholder="Search name or email…"
      filters={[{ type: 'select', param: 'role', label: 'Filter by role', allLabel: 'All roles', options: ROLE_OPTIONS }]}
    />
  );
}
