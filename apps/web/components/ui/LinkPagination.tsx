import Link from 'next/link';
import type { Paginated } from '@healthcare/types';

/** Server-rendered pagination: plain links, no client JS. */
export function LinkPagination({ data, hrefFor }: { data: Paginated<unknown>; hrefFor: (page: number) => string }) {
  if (data.pages <= 1) return null;
  return (
    <div className="pagination">
      <span>Page {data.page} of {data.pages} · {data.total} records</span>
      <div className="heading-actions">
        {data.page > 1
          ? <Link className="btn secondary" href={hrefFor(data.page - 1)}>Previous</Link>
          : <button className="btn secondary" disabled>Previous</button>}
        {data.page < data.pages
          ? <Link className="btn secondary" href={hrefFor(data.page + 1)}>Next</Link>
          : <button className="btn secondary" disabled>Next</button>}
      </div>
    </div>
  );
}
