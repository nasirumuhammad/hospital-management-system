'use client';
import type { ColumnDef } from '@tanstack/react-table';
import type { MedicalRecord, Paginated } from '@healthcare/types';
import { DataTable } from '@/components/ui/DataTable';
import { PersonCell } from '@/components/ui/Page';
import { formatDate, fullName } from '@/lib/format';
import type { SortSpec } from '@/lib/search-params';
import { RecordRowActions } from './record-actions.client';
import { RECORD_SORTABLE, RECORD_DEFAULT_SORT } from './records-table.config';


export function RecordsTable({ data, sort, canEdit }: { data: Paginated<MedicalRecord>; sort: SortSpec; canEdit: boolean }) {
  const columns: ColumnDef<MedicalRecord>[] = [
    { id: 'patient', header: 'Patient', enableSorting: true, enableHiding: false, cell: ({ row }) => <PersonCell name={fullName(row.original.patient)} tone="patient" /> },
    { id: 'diagnosis', header: 'Diagnosis', enableSorting: true, cell: ({ row }) => row.original.diagnosis },
    {
      id: 'doctor', header: 'Doctor', enableSorting: true,
      cell: ({ row }) => <>Dr. {fullName(row.original.doctor)}<small className="sub-cell">{row.original.doctor?.specialty}</small></>,
    },
    { id: 'createdAt', header: 'Date', enableSorting: true, cell: ({ row }) => formatDate(row.original.createdAt) },
    { id: 'actions', header: 'Actions', enableHiding: false, cell: ({ row }) => <RecordRowActions record={row.original} canEdit={canEdit} /> },
  ];
  return (
    <DataTable
      columns={columns} data={data} sort={sort} defaultSort={RECORD_DEFAULT_SORT} storageKey="medical-records" getRowId={(row) => row.id}
      emptyLabel="medical records" searchPlaceholder="Search patient, doctor or diagnosis…"
    />
  );
}
