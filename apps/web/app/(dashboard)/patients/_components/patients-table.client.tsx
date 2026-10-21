'use client';
import type { ColumnDef } from '@tanstack/react-table';
import { GENDERS, type Paginated, type Patient } from '@healthcare/types';
import { DataTable } from '@/components/ui/DataTable';
import { PersonCell } from '@/components/ui/Page';
import { fullName } from '@/lib/format';
import type { SortSpec } from '@/lib/search-params';
import { PatientRowActions } from './patient-actions.client';
import { PATIENT_SORTABLE, PATIENT_DEFAULT_SORT } from './patients-table.config';

const GENDER_OPTIONS = GENDERS.map((value) => ({ value, label: value }));

export function PatientsTable({ data, sort, isAdmin }: { data: Paginated<Patient>; sort: SortSpec; isAdmin: boolean }) {
  const columns: ColumnDef<Patient>[] = [
    { id: 'name', header: 'Patient', enableSorting: true, enableHiding: false, cell: ({ row }) => <PersonCell name={fullName(row.original)} tone="patient" /> },
    { id: 'email', header: 'Email address', enableSorting: true, cell: ({ row }) => row.original.email },
    { id: 'phone', header: 'Phone', enableSorting: true, cell: ({ row }) => row.original.phone || '—' },
    { id: 'gender', header: 'Gender', enableSorting: true, cell: ({ row }) => row.original.gender || '—' },
    { id: 'dateOfBirth', header: 'Date of birth', enableSorting: true, cell: ({ row }) => row.original.dateOfBirth || '—' },
    ...(isAdmin ? [{ id: 'actions', header: 'Actions', enableHiding: false, cell: ({ row }) => <PatientRowActions patient={row.original} /> } satisfies ColumnDef<Patient>] : []),
  ];
  return (
    <DataTable
      columns={columns} data={data} sort={sort} defaultSort={PATIENT_DEFAULT_SORT} storageKey="patients" getRowId={(row) => row.id}
      emptyLabel="patients" searchPlaceholder="Search name, email, phone or ID…"
      filters={[{ type: 'select', param: 'gender', label: 'Filter by gender', allLabel: 'All genders', options: GENDER_OPTIONS }]}
    />
  );
}
