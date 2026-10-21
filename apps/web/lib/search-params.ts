export type PageSearchParams = Promise<Record<string, string | string[] | undefined>>;
type Param = string | string[] | undefined;

export const DEFAULT_PAGE_SIZE = 15;

export const first = (value: Param): string | undefined => (Array.isArray(value) ? value[0] : value);

export const pageNumber = (value: Param): number => Math.max(1, Math.floor(Number(first(value))) || 1);

export const searchTerm = (value: Param): string | undefined => first(value)?.trim() || undefined;

/** Returns the value only if it is one of the allowed literals, so URL input never reaches the API unchecked. */
export const oneOf = <T extends string>(value: Param, allowed: readonly T[]): T | undefined => {
  const candidate = first(value);
  return allowed.find((item) => item === candidate);
};

export const PAGE_SIZES = [10, 15, 25, 50, 100] as const;

export interface SortSpec {
  id: string;
  desc: boolean;
}

/**
 * Reads the table state (`page`, `limit`, `sort`, `order`, `q`) from the URL and validates it.
 * `sortable` is the allow-list of column ids the API accepts, so URL input never reaches the API unchecked.
 */
export function tableQuery(
  params: Record<string, string | string[] | undefined>,
  { sortable, defaultSort, defaultLimit = DEFAULT_PAGE_SIZE }: { sortable: readonly string[]; defaultSort: SortSpec; defaultLimit?: number },
) {
  const requestedLimit = Number(first(params.limit));
  const limit = PAGE_SIZES.find((size) => size === requestedLimit) ?? defaultLimit;
  const requestedSort = sortable.find((id) => id === first(params.sort));
  const requestedOrder = oneOf(params.order, ['asc', 'desc'] as const);
  const sort: SortSpec = requestedSort ? { id: requestedSort, desc: (requestedOrder ?? 'asc') === 'desc' } : defaultSort;
  return {
    page: pageNumber(params.page),
    limit,
    q: searchTerm(params.q),
    sort,
    /** Ready to spread into the API query. */
    apiSort: { sortBy: sort.id, order: sort.desc ? 'desc' : 'asc' } as const,
  };
}
