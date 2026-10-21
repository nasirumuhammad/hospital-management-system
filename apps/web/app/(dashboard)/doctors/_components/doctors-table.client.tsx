'use client';
import type { ColumnDef } from '@tanstack/react-table';
import type { Doctor, Paginated } from '@healthcare/types';
import { DataTable } from '@/components/ui/DataTable';
import { PersonCell } from '@/components/ui/Page';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { fullName } from '@/lib/format';
import type { SortSpec } from '@/lib/search-params';
import { DoctorRowActions } from './doctor-actions.client';
import { DOCTOR_SORTABLE, DOCTOR_DEFAULT_SORT } from './doctors-table.config';


export function DoctorsTable({ data, sort, isAdmin }: { data: Paginated<Doctor>; sort: SortSpec; isAdmin: boolean }) {
  const columns: ColumnDef<Doctor>[] = [
    { id: 'name', header: 'Doctor', enableSorting: true, enableHiding: false, cell: ({ row }) => <PersonCell name={`Dr. ${fullName(row.original)}`} tone="doctor" /> },
    { id: 'specialty', header: 'Specialty', enableSorting: true, cell: ({ row }) => row.original.specialty },
    { id: 'email', header: 'Email address', enableSorting: true, cell: ({ row }) => row.original.email },
    { id: 'qualification', header: 'Qualification', enableSorting: true, cell: ({ row }) => row.original.qualification || '—' },
    { id: 'status', header: 'Status', enableSorting: true, cell: ({ row }) => <StatusBadge value={row.original.isActive ? 'ACTIVE' : 'INACTIVE'} /> },
    ...(isAdmin ? [{ id: 'actions', header: 'Actions', enableHiding: false, cell: ({ row }) => <DoctorRowActions doctor={row.original} /> } satisfies ColumnDef<Doctor>] : []),
  ];
  return (
    <DataTable
      columns={columns} data={data} sort={sort} defaultSort={DOCTOR_DEFAULT_SORT} storageKey="doctors" getRowId={(row) => row.id}
      emptyLabel="doctors" searchPlaceholder="Search name, specialty or email…"
      filters={isAdmin ? [{ type: 'checkbox', param: 'includeInactive', label: 'Show inactive' }] : []}
    />
  );
}
