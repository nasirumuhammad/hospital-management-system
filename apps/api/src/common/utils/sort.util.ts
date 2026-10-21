import { ObjectLiteral, SelectQueryBuilder } from 'typeorm';

/** Maps a public sort key (what the client may send) to one or more query-builder column paths. */
export type SortMap = Record<string, string | string[]>;

interface SortRequest {
  sortBy?: string;
  order?: 'asc' | 'desc';
}

interface SortFallback {
  sortBy: string;
  order: 'asc' | 'desc';
}

/**
 * Applies a whitelisted ORDER BY. Client input is only ever used as a key into `map`, never
 * interpolated into SQL, so an unknown key can neither inject SQL nor sort by a hidden column.
 * `tieBreaker` keeps pagination stable when many rows share the sorted value.
 */
export function applySort<T extends ObjectLiteral>(
  builder: SelectQueryBuilder<T>,
  request: SortRequest,
  map: SortMap,
  fallback: SortFallback,
  tieBreaker: string,
): SelectQueryBuilder<T> {
  const requested = request.sortBy && Object.prototype.hasOwnProperty.call(map, request.sortBy);
  const key = requested ? (request.sortBy as string) : fallback.sortBy;
  const direction = (request.order ?? fallback.order) === 'asc' ? 'ASC' : 'DESC';
  const columns = ([] as string[]).concat(map[key]);
  columns.forEach((column, index) => (index === 0 ? builder.orderBy(column, direction) : builder.addOrderBy(column, direction)));
  return builder.addOrderBy(tieBreaker, 'ASC');
}
