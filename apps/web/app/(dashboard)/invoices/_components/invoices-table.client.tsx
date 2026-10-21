'use client';
import type { ColumnDef } from '@tanstack/react-table';
import { INVOICE_STATUSES, type Invoice, type Paginated } from '@healthcare/types';
import { DataTable } from '@/components/ui/DataTable';
import { PersonCell } from '@/components/ui/Page';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatDate, formatMoney, fullName, titleCase } from '@/lib/format';
import type { SortSpec } from '@/lib/search-params';
import { InvoiceDetailsButton } from './invoice-actions.client';
import { INVOICE_SORTABLE, INVOICE_DEFAULT_SORT } from './invoices-table.config';

const STATUS_OPTIONS = INVOICE_STATUSES.map((value) => ({ value, label: titleCase(value) }));

export function InvoicesTable({ data, sort }: { data: Paginated<Invoice>; sort: SortSpec }) {
  const columns: ColumnDef<Invoice>[] = [
    { id: 'id', header: 'Invoice ID', enableSorting: false, cell: ({ row }) => <code title={row.original.id}>{row.original.id}</code> },
    { id: 'patient', header: 'Patient', enableSorting: true, enableHiding: false, cell: ({ row }) => <PersonCell name={fullName(row.original.patient)} tone="patient" /> },
    { id: 'description', header: 'Description', enableSorting: true, cell: ({ row }) => row.original.description },
    { id: 'amount', header: 'Amount', enableSorting: true, cell: ({ row }) => formatMoney(row.original.amount) },
    { id: 'amountPaid', header: 'Paid', enableSorting: true, cell: ({ row }) => formatMoney(row.original.amountPaid) },
    { id: 'dueDate', header: 'Due', enableSorting: true, cell: ({ row }) => (row.original.dueDate ? formatDate(row.original.dueDate) : '—') },
    { id: 'status', header: 'Status', enableSorting: true, cell: ({ row }) => <StatusBadge value={row.original.status} /> },
    { id: 'details', enableHiding: false, header: () => <span className="sr-only">Details</span>, cell: ({ row }) => <InvoiceDetailsButton id={row.original.id} /> },
  ];
  return (
    <DataTable
      columns={columns} data={data} sort={sort} defaultSort={INVOICE_DEFAULT_SORT} storageKey="invoices" getRowId={(row) => row.id}
      emptyLabel="invoices" searchPlaceholder="Search patient or description…"
      filters={[{ type: 'select', param: 'status', label: 'Filter by status', allLabel: 'All statuses', options: STATUS_OPTIONS }]}
    />
  );
}
