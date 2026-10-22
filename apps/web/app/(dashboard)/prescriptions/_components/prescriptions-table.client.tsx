'use client';
import type { ColumnDef } from '@tanstack/react-table';
import type { Paginated, Prescription } from '@healthcare/types';
import { DataTable } from '@/components/ui/DataTable';
import { PersonCell } from '@/components/ui/Page';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatDate, fullName } from '@/lib/format';
import type { SortSpec } from '@/lib/search-params';
import { PRESCRIPTION_SORTABLE, PRESCRIPTION_DEFAULT_SORT } from './prescriptions-table.config';


export function PrescriptionsTable({ data, sort }: { data: Paginated<Prescription>; sort: SortSpec }) {
  const columns: ColumnDef<Prescription>[] = [
    { id: 'patient', header: 'Patient', enableSorting: true, enableHiding: false, cell: ({ row }) => <PersonCell name={fullName(row.original.patient)} tone="patient" /> },
    {
      id: 'medication', header: 'Medication', enableSorting: true,
      cell: ({ row }) => <><b>{row.original.medication}</b>{row.original.instructions && <small className="sub-cell">{row.original.instructions}</small>}</>,
    },
    { id: 'dosage', header: 'Dosage', enableSorting: true, cell: ({ row }) => row.original.dosage },
    { id: 'frequency', header: 'Frequency', enableSorting: true, cell: ({ row }) => row.original.frequency },
    { id: 'duration', header: 'Duration', enableSorting: true, cell: ({ row }) => row.original.duration },
    { id: 'doctor', header: 'Prescribed by', enableSorting: true, cell: ({ row }) => <>Dr. {fullName(row.original.doctor)}</> },
    { id: 'status', header: 'Status', enableSorting: false, cell: ({ row }) => <StatusBadge value={row.original.status ?? 'PENDING'} /> },
    { id: 'createdAt', header: 'Date', enableSorting: true, cell: ({ row }) => formatDate(row.original.createdAt) },
  ];
  return (
    <DataTable
      columns={columns} data={data} sort={sort} defaultSort={PRESCRIPTION_DEFAULT_SORT} storageKey="prescriptions" getRowId={(row) => row.id}
      emptyLabel="prescriptions" searchPlaceholder="Search patient, doctor or medication…"
    />
  );
}
