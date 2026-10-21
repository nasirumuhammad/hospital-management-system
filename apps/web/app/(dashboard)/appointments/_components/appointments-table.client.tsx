'use client';
import type { ColumnDef } from '@tanstack/react-table';
import { APPOINTMENT_STATUSES, type Appointment, type Paginated, type UserRole } from '@healthcare/types';
import { DataTable } from '@/components/ui/DataTable';
import { PersonCell } from '@/components/ui/Page';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatDateTime, fullName, titleCase } from '@/lib/format';
import type { SortSpec } from '@/lib/search-params';
import { AppointmentRowActions } from './appointment-row-actions.client';
import { APPOINTMENT_SORTABLE, APPOINTMENT_DEFAULT_SORT } from './appointments-table.config';

const STATUS_OPTIONS = APPOINTMENT_STATUSES.map((value) => ({ value, label: titleCase(value) }));

export function AppointmentsTable({ data, sort, role }: { data: Paginated<Appointment>; sort: SortSpec; role: UserRole }) {
  const columns: ColumnDef<Appointment>[] = [
    { id: 'patient', header: 'Patient', enableSorting: true, enableHiding: false, cell: ({ row }) => <PersonCell name={fullName(row.original.patient)} tone="patient" /> },
    {
      id: 'doctor', header: 'Doctor', enableSorting: true,
      cell: ({ row }) => <>Dr. {fullName(row.original.doctor)}<small className="sub-cell">{row.original.doctor?.specialty}</small></>,
    },
    { id: 'scheduledAt', header: 'Date & time', enableSorting: true, cell: ({ row }) => formatDateTime(row.original.scheduledAt) },
    { id: 'reason', header: 'Reason', enableSorting: true, cell: ({ row }) => row.original.reason || '—' },
    { id: 'status', header: 'Status', enableSorting: true, cell: ({ row }) => <StatusBadge value={row.original.status} /> },
    {
      id: 'actions', header: 'Actions', enableHiding: false,
      cell: ({ row }) => (
        <AppointmentRowActions
          role={role}
          appointment={{ id: row.original.id, status: row.original.status, scheduledAt: row.original.scheduledAt, doctorName: fullName(row.original.doctor) }}
        />
      ),
    },
  ];
  return (
    <DataTable
      columns={columns} data={data} sort={sort} defaultSort={APPOINTMENT_DEFAULT_SORT} storageKey="appointments" getRowId={(row) => row.id}
      emptyLabel="appointments" searchPlaceholder="Search patient, doctor or reason…"
      filters={[{ type: 'select', param: 'status', label: 'Filter by status', allLabel: 'All statuses', options: STATUS_OPTIONS }]}
    />
  );
}
