import { INVOICE_STATUSES, type Invoice, type Paginated } from '@healthcare/types';
import { ListPanel, PageHeader } from '@/components/ui/Page';
import { oneOf, tableQuery, type PageSearchParams } from '@/lib/search-params';
import { serverApi } from '@/lib/server-api';
import { getSessionUser } from '@/lib/session';
import { CreateInvoiceButton } from './_components/invoice-actions.client';
import { InvoicesTable } from './_components/invoices-table.client';
import { INVOICE_SORTABLE, INVOICE_DEFAULT_SORT } from './_components/invoices-table.config';

export default async function InvoicesPage({ searchParams }: { searchParams: PageSearchParams }) {
  const user = await getSessionUser();
  if (!user) return null;

  const params = await searchParams;
  const { page, limit, q, sort, apiSort } = tableQuery(params, { sortable: INVOICE_SORTABLE, defaultSort: INVOICE_DEFAULT_SORT });
  const status = oneOf(params.status, INVOICE_STATUSES);
  const data = await serverApi<Paginated<Invoice>>('/invoices', { query: { page, limit, q, status, ...apiSort } });

  return (
    <>
      <PageHeader title="Invoices" description="Billing and payments." extra={['ADMIN','CASHIER'].includes(user.role) && <CreateInvoiceButton />} />
      <ListPanel title="Invoices" description={`${data.total.toLocaleString('en-US')} invoices`}>
        <InvoicesTable data={data} sort={sort} />
      </ListPanel>
    </>
  );
}
