import type { Paginated, SessionUser } from '@healthcare/types';
import { EmptyState } from '@/components/ui/Feedback';
import { LinkPagination } from '@/components/ui/LinkPagination';
import { ListPanel, PageHeader } from '@/components/ui/Page';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { SearchFilter } from '@/components/ui/UrlFilters';
import { formatDate } from '@/lib/format';
import { DEFAULT_PAGE_SIZE, hrefBuilder, pageNumber, searchTerm, type PageSearchParams } from '@/lib/search-params';
import { serverApi } from '@/lib/server-api';
import { getSessionUser } from '@/lib/session';
import { AccountRowActions, AddAccountButton } from './_components/account-actions.client';

export default async function AccountsPage({ searchParams }: { searchParams: PageSearchParams }) {
  const me = await getSessionUser();
  if (!me) return null;

  const params = await searchParams;
  const q = searchTerm(params.q);
  const data = await serverApi<Paginated<SessionUser>>('/users', { query: { page: pageNumber(params.page), limit: DEFAULT_PAGE_SIZE, q } });

  return (
    <>
      <PageHeader title="Accounts" description="Sign-in accounts for staff and patients." extra={<AddAccountButton />} />
      <ListPanel title="User accounts" description={`${data.total} accounts`} toolbar={<SearchFilter />}>
        <div className="table-scroll">
          <table>
            <thead><tr><th>Name</th><th>Email address</th><th>Role</th><th>Email</th><th>Status</th><th>Created</th><th>Actions</th></tr></thead>
            <tbody>
              {data.items.map((account) => (
                <tr key={account.id}>
                  <td><b>{account.name}</b></td><td>{account.email}</td>
                  <td><StatusBadge value={account.role} /></td>
                  <td>{account.emailVerified ? 'Verified' : 'Unverified'}</td>
                  <td><StatusBadge value={account.isActive ? 'ACTIVE' : 'DISABLED'} /></td>
                  <td>{formatDate(account.createdAt)}</td>
                  <td><AccountRowActions account={account} isSelf={account.id === me.id} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.items.length === 0 && <EmptyState loading={false} label="accounts" />}
        </div>
        <LinkPagination data={data} hrefFor={hrefBuilder({ q })} />
      </ListPanel>
    </>
  );
}
