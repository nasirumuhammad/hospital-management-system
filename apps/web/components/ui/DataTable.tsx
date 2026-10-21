'use client';

import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type OnChangeFn,
  type SortingState,
  type VisibilityState,
} from '@tanstack/react-table';
import type { Paginated } from '@healthcare/types';
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Columns3, RotateCcw } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { DEFAULT_PAGE_SIZE, PAGE_SIZES, type SortSpec } from '@/lib/search-params';
import { EmptyState } from './Feedback';
import { SearchBox } from './SearchBox';

export type TableFilter =
  | { type: 'select'; param: string; label: string; allLabel: string; options: { value: string; label: string }[] }
  | { type: 'checkbox'; param: string; label: string };

interface DataTableProps<TData> {
  /** Column `id` must equal the API sort key. Set `enableSorting: true` only on columns the API can sort. */
  columns: ColumnDef<TData, any>[]; // eslint-disable-line @typescript-eslint/no-explicit-any
  data: Paginated<TData>;
  /** The sort the server actually applied (from the URL, or the default). */
  sort: SortSpec;
  defaultSort: SortSpec;
  emptyLabel: string;
  searchPlaceholder?: string;
  filters?: TableFilter[];
  /** Persists the column picker per table in this browser. */
  storageKey: string;
  /** Page size used when `limit` is absent from the URL (keeps URLs clean). */
  defaultLimit?: number;
  getRowId?: (row: TData) => string;
}

const PAGE_WINDOW = 5;

/**
 * Server-driven table. TanStack Table renders headers, sorting state, pagination state and column
 * visibility; the data itself is paged, sorted and filtered by the API. All state is kept in the URL
 * (`page`, `limit`, `sort`, `order`, `q`, plus filters) so views are bookmarkable and the server page
 * re-renders with the right rows. Thousands of records are never sent to the browser at once.
 */
export function DataTable<TData>({ columns, data, sort, defaultSort, emptyLabel, searchPlaceholder, filters = [], storageKey, defaultLimit = DEFAULT_PAGE_SIZE, getRowId }: DataTableProps<TData>) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [searchResets, setSearchResets] = useState(0); // remounts the search box so Reset clears its text

  // Read after mount so the server and first client render match.
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(`table:${storageKey}`);
      if (saved) setColumnVisibility(JSON.parse(saved) as VisibilityState);
    } catch { /* storage unavailable: keep defaults */ }
  }, [storageKey]);

  const navigate = useCallback((changes: Record<string, string | undefined>, { resetPage = true, replace = false } = {}) => {
    const next = new URLSearchParams(searchParams.toString());
    Object.entries(changes).forEach(([key, value]) => (value ? next.set(key, value) : next.delete(key)));
    if (resetPage) next.delete('page');
    const query = next.toString();
    const href = query ? `${pathname}?${query}` : pathname;
    startTransition(() => (replace ? router.replace(href, { scroll: false }) : router.push(href, { scroll: false })));
  }, [router, pathname, searchParams]);

  const onSortingChange: OnChangeFn<SortingState> = (updater) => {
    const current: SortingState = [{ id: sort.id, desc: sort.desc }];
    const [next] = typeof updater === 'function' ? updater(current) : updater;
    // Clearing the sort (third click) returns to the default order.
    const target = next ?? defaultSort;
    const isDefault = target.id === defaultSort.id && target.desc === defaultSort.desc;
    navigate({ sort: isDefault ? undefined : target.id, order: isDefault ? undefined : target.desc ? 'desc' : 'asc' });
  };

  const onVisibilityChange: OnChangeFn<VisibilityState> = (updater) => {
    setColumnVisibility((previous) => {
      const next = typeof updater === 'function' ? updater(previous) : updater;
      try { window.localStorage.setItem(`table:${storageKey}`, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  };

  // TanStack only lets a column sort when it has an accessor. Our sorting happens on the server, so
  // sortable display columns just need a placeholder accessor to be allowed to toggle sorting.
  const tableColumns = useMemo(
    () => columns.map((column) => (column.enableSorting && !('accessorKey' in column) && !('accessorFn' in column) ? { ...column, accessorFn: () => null } : column)),
    [columns],
  );

  const table = useReactTable({
    data: data.items,
    columns: tableColumns,
    getRowId,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
    pageCount: data.pages,
    enableSortingRemoval: true,
    defaultColumn: { enableSorting: false, sortDescFirst: false },
    state: { sorting: [{ id: sort.id, desc: sort.desc }], pagination: { pageIndex: data.page - 1, pageSize: data.limit }, columnVisibility },
    onSortingChange,
    onColumnVisibilityChange: onVisibilityChange,
  });

  const activeFilters = filters.some((filter) => searchParams.get(filter.param)) || Boolean(searchParams.get('q'));
  const firstRow = data.total === 0 ? 0 : (data.page - 1) * data.limit + 1;
  const lastRow = Math.min(data.page * data.limit, data.total);
  const goToPage = (page: number) => navigate({ page: page <= 1 ? undefined : String(page) }, { resetPage: false });

  const onSearch = useCallback((term: string) => {
    if (term === (searchParams.get('q') ?? '')) return; // SearchBox reports once on mount
    navigate({ q: term || undefined }, { replace: true });
  }, [navigate, searchParams]);

  return (
    <div className="data-table-root" data-pending={pending || undefined} aria-busy={pending}>
      <div className="table-toolbar">
        <div className="toolbar-controls">
          {searchPlaceholder && <SearchBox key={searchResets} onSearch={onSearch} initialValue={searchParams.get('q') ?? ''} placeholder={searchPlaceholder} />}
          {filters.map((filter) => filter.type === 'select' ? (
            <select key={filter.param} value={searchParams.get(filter.param) ?? ''} aria-label={filter.label}
              onChange={(event) => navigate({ [filter.param]: event.target.value || undefined }, { replace: true })}>
              <option value="">{filter.allLabel}</option>
              {filter.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          ) : (
            <label key={filter.param} className="table-check">
              <input type="checkbox" checked={searchParams.get(filter.param) === 'true'}
                onChange={(event) => navigate({ [filter.param]: event.target.checked ? 'true' : undefined }, { replace: true })} /> {filter.label}
            </label>
          ))}
          {activeFilters && (
            <button type="button" className="btn secondary small" onClick={() => {
              setSearchResets((count) => count + 1);
              navigate({ q: undefined, ...Object.fromEntries(filters.map((filter) => [filter.param, undefined])) }, { replace: true });
            }}>
              <RotateCcw size={13} /> Reset
            </button>
          )}
        </div>
        <ColumnPicker table={table} />
      </div>

      <div className="table-scroll data-table-wrap">
        <table className="data-table">
          <thead>
            {table.getHeaderGroups().map((group) => (
              <tr key={group.id}>
                {group.headers.map((header) => {
                  const sorted = header.column.getIsSorted();
                  const canSort = header.column.getCanSort();
                  return (
                    <th key={header.id} scope="col" aria-sort={sorted === 'asc' ? 'ascending' : sorted === 'desc' ? 'descending' : canSort ? 'none' : undefined}>
                      {header.isPlaceholder ? null : canSort ? (
                        <button type="button" className="table-sort" data-active={sorted || undefined} onClick={header.column.getToggleSortingHandler()}>
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {sorted === 'asc' ? <ArrowUp size={13} /> : sorted === 'desc' ? <ArrowDown size={13} /> : <ArrowUpDown size={13} />}
                        </button>
                      ) : flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id}>
                {row.getVisibleCells().map((cell) => <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
        {data.items.length === 0 && <EmptyState loading={false} label={emptyLabel} />}
      </div>

      <div className="pagination">
        <span>
          {data.total === 0 ? 'No records' : `Showing ${firstRow.toLocaleString('en-US')}–${lastRow.toLocaleString('en-US')} of ${data.total.toLocaleString('en-US')}`}
        </span>
        <div className="pagination-controls">
          <label className="page-size">
            Rows
            <select value={data.limit} aria-label="Rows per page" onChange={(event) => navigate({ limit: Number(event.target.value) === defaultLimit ? undefined : event.target.value })}>
              {PAGE_SIZES.map((size) => <option key={size} value={size}>{size}</option>)}
            </select>
          </label>
          <nav className="page-buttons" aria-label="Pagination">
            <button type="button" className="icon-btn" onClick={() => goToPage(1)} disabled={!table.getCanPreviousPage()} aria-label="First page"><ChevronsLeft size={16} /></button>
            <button type="button" className="icon-btn" onClick={() => goToPage(data.page - 1)} disabled={!table.getCanPreviousPage()} aria-label="Previous page"><ChevronLeft size={16} /></button>
            {pageWindow(data.page, data.pages).map((page) => (
              <button key={page} type="button" className="page-number" data-active={page === data.page || undefined} aria-current={page === data.page ? 'page' : undefined} onClick={() => goToPage(page)}>{page}</button>
            ))}
            <button type="button" className="icon-btn" onClick={() => goToPage(data.page + 1)} disabled={!table.getCanNextPage()} aria-label="Next page"><ChevronRight size={16} /></button>
            <button type="button" className="icon-btn" onClick={() => goToPage(data.pages)} disabled={!table.getCanNextPage()} aria-label="Last page"><ChevronsRight size={16} /></button>
          </nav>
        </div>
      </div>
    </div>
  );
}

/** A sliding window of page numbers centred on the current page. */
function pageWindow(current: number, total: number): number[] {
  const size = Math.min(PAGE_WINDOW, total);
  const start = Math.max(1, Math.min(current - Math.floor(size / 2), total - size + 1));
  return Array.from({ length: size }, (_, index) => start + index);
}

function ColumnPicker<TData>({ table }: { table: ReturnType<typeof useReactTable<TData>> }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const hideable = useMemo(() => table.getAllLeafColumns().filter((column) => column.getCanHide() && typeof column.columnDef.header === 'string'), [table]);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent ? event.key === 'Escape' : !ref.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', close);
    };
  }, [open]);

  if (hideable.length < 2) return null;
  return (
    <div className="column-picker" ref={ref}>
      <button type="button" className="btn secondary small" aria-expanded={open} aria-haspopup="true" onClick={() => setOpen((value) => !value)}>
        <Columns3 size={14} /> Columns
      </button>
      {open && (
        <div className="column-menu" role="group" aria-label="Visible columns">
          {hideable.map((column) => (
            <label key={column.id}>
              <input type="checkbox" checked={column.getIsVisible()} onChange={column.getToggleVisibilityHandler()} /> {column.columnDef.header as string}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
