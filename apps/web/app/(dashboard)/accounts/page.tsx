import { USER_ROLES, type Paginated, type SessionUser } from '@healthcare/types';
import { ListPanel, PageHeader } from '@/components/ui/Page';
import { oneOf, tableQuery, type PageSearchParams } from '@/lib/search-params';
import { serverApi } from '@/lib/server-api';
import { getSessionUser } from '@/lib/session';
import { AddAccountButton } from './_components/account-actions.client';
import { AccountsTable } from './_components/accounts-table.client';
import { ACCOUNT_SORTABLE, ACCOUNT_DEFAULT_SORT } from './_components/accounts-table.config';

export default async function AccountsPage({ searchParams }: { searchParams: PageSearchParams }) {
  const me = await getSessionUser();
  if (!me) return null;

  const params = await searchParams;
  const { page, limit, q, sort, apiSort } = tableQuery(params, { sortable: ACCOUNT_SORTABLE, defaultSort: ACCOUNT_DEFAULT_SORT });
  const role = oneOf(params.role, USER_ROLES);
  const data = await serverApi<Paginated<SessionUser>>('/users', { query: { page, limit, q, role, ...apiSort } });

  return (
    <>
      <PageHeader title="Accounts" description="Sign-in accounts only. The people behind them are kept in Patients, Doctors and Staff, so deleting an account never deletes the person." extra={<AddAccountButton />} />
      <ListPanel title="User accounts" description={`${data.total.toLocaleString('en-US')} accounts`}>
        <AccountsTable data={data} sort={sort} selfId={me.id} />
      </ListPanel>
    </>
  );
}
