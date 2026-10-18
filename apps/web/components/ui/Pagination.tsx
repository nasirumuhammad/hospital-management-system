import type { Paginated } from '@healthcare/types';

export function Pagination({ data, onPage }: { data: Paginated<unknown> | null; onPage: (page: number) => void }) {
  if (!data || data.pages <= 1) return null;
  return (
    <div className="pagination">
      <span>Page {data.page} of {data.pages} · {data.total} records</span>
      <div className="heading-actions">
        <button className="btn secondary" disabled={data.page <= 1} onClick={() => onPage(data.page - 1)}>Previous</button>
        <button className="btn secondary" disabled={data.page >= data.pages} onClick={() => onPage(data.page + 1)}>Next</button>
      </div>
    </div>
  );
}
