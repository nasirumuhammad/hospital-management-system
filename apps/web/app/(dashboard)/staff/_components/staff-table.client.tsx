'use client';
import type { ColumnDef } from '@tanstack/react-table';
import { STAFF_ROLES, type Paginated, type StaffMember } from '@healthcare/types';
import { DataTable } from '@/components/ui/DataTable';
import { PersonCell } from '@/components/ui/Page';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { fullName, titleCase } from '@/lib/format';
import type { SortSpec } from '@/lib/search-params';
import { StaffRowActions } from './staff-actions.client';
import { STAFF_DEFAULT_SORT } from './staff-table.config';

const ROLE_OPTIONS = STAFF_ROLES.map((value) => ({ value, label: titleCase(value) }));

export function StaffTable({ data, sort }: { data: Paginated<StaffMember>; sort: SortSpec }) {
  const columns: ColumnDef<StaffMember>[] = [
    { id: 'name', header: 'Staff member', enableSorting: true, enableHiding: false, cell: ({ row }) => <PersonCell name={fullName(row.original)} tone="doctor" /> },
    { id: 'role', header: 'Role', enableSorting: true, cell: ({ row }) => <StatusBadge value={row.original.role} /> },
    { id: 'jobTitle', header: 'Job title', enableSorting: true, cell: ({ row }) => row.original.jobTitle || '—' },
    { id: 'email', header: 'Email address', enableSorting: true, cell: ({ row }) => row.original.email },
    { id: 'login', header: 'Login', cell: ({ row }) => (row.original.userId ? 'Has login' : 'No login') },
    { id: 'status', header: 'Status', enableSorting: true, cell: ({ row }) => <StatusBadge value={row.original.isActive ? 'ACTIVE' : 'INACTIVE'} /> },
    { id: 'actions', header: 'Actions', enableHiding: false, cell: ({ row }) => <StaffRowActions member={row.original} /> },
  ];
  return (
    <DataTable
      columns={columns} data={data} sort={sort} defaultSort={STAFF_DEFAULT_SORT} storageKey="staff" getRowId={(row) => row.id}
      emptyLabel="staff members" searchPlaceholder="Search name, job title or email…"
      filters={[
        { type: 'select', param: 'role', label: 'Filter by role', allLabel: 'All roles', options: ROLE_OPTIONS },
        { type: 'checkbox', param: 'includeInactive', label: 'Show inactive' },
      ]}
    />
  );
}
