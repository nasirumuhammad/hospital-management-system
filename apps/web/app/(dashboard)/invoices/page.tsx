import { INVOICE_STATUSES, type Invoice, type Paginated } from '@healthcare/types';
import { EmptyState } from '@/components/ui/Feedback';
import { LinkPagination } from '@/components/ui/LinkPagination';
import { ListPanel, PageHeader, PersonCell } from '@/components/ui/Page';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { SelectFilter } from '@/components/ui/UrlFilters';
import { formatDate, formatMoney, fullName, titleCase } from '@/lib/format';
import { DEFAULT_PAGE_SIZE, hrefBuilder, oneOf, pageNumber, type PageSearchParams } from '@/lib/search-params';
import { serverApi } from '@/lib/server-api';
import { getSessionUser } from '@/lib/session';
import { CreateInvoiceButton, InvoiceDetailsButton } from './_components/invoice-actions.client';

const STATUS_OPTIONS = INVOICE_STATUSES.map((value) => ({ value, label: titleCase(value) }));

export default async function InvoicesPage({ searchParams }: { searchParams: PageSearchParams }) {
  const user = await getSessionUser();
  if (!user) return null;

  const params = await searchParams;
  const status = oneOf(params.status, INVOICE_STATUSES);
  const data = await serverApi<Paginated<Invoice>>('/invoices', { query: { page: pageNumber(params.page), limit: DEFAULT_PAGE_SIZE, status } });

  return (
    <>
      <PageHeader title="Invoices" description="Billing and payments." extra={user.role === 'ADMIN' && <CreateInvoiceButton />} />
      <ListPanel title="Invoices" description={`${data.total} invoices`}
        toolbar={<SelectFilter param="status" label="Filter by status" allLabel="All statuses" options={STATUS_OPTIONS} />}>
        <div className="table-scroll">
          <table>
            <thead><tr><th>Patient</th><th>Description</th><th>Amount</th><th>Paid</th><th>Due</th><th>Status</th><th /></tr></thead>
            <tbody>
              {data.items.map((invoice) => (
                <tr key={invoice.id}>
                  <td><PersonCell name={fullName(invoice.patient)} tone="patient" /></td>
                  <td>{invoice.description}</td>
                  <td>{formatMoney(invoice.amount)}</td><td>{formatMoney(invoice.amountPaid)}</td>
                  <td>{invoice.dueDate ? formatDate(invoice.dueDate) : '—'}</td>
                  <td><StatusBadge value={invoice.status} /></td>
                  <td><InvoiceDetailsButton id={invoice.id} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.items.length === 0 && <EmptyState loading={false} label="invoices" />}
        </div>
        <LinkPagination data={data} hrefFor={hrefBuilder({ status })} />
      </ListPanel>
    </>
  );
}
