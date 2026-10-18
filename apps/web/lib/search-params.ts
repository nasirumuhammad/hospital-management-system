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

/** Builds `?filter=…&page=n` links that keep the active filters. */
export function hrefBuilder(filters: Record<string, string | undefined>) {
  return (page: number): string => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    params.set('page', String(page));
    return `?${params}`;
  };
}
