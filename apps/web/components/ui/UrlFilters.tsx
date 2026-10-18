'use client';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useTransition } from 'react';
import { SearchBox } from './SearchBox';

/**
 * List filters live in the URL, so the server page re-renders with the new query and
 * the result is bookmarkable. Changing any filter resets pagination.
 */
function useUrlFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const get = (key: string): string => searchParams.get(key) ?? '';

  const set = useCallback((key: string, value: string) => {
    if (value === (searchParams.get(key) ?? '')) return; // SearchBox fires once on mount
    const next = new URLSearchParams(searchParams.toString());
    if (value) next.set(key, value); else next.delete(key);
    next.delete('page');
    const query = next.toString();
    startTransition(() => router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false }));
  }, [router, pathname, searchParams]);

  return { get, set };
}

export function SearchFilter({ placeholder }: { placeholder?: string }) {
  const { get, set } = useUrlFilters();
  const onSearch = useCallback((term: string) => set('q', term), [set]);
  return <SearchBox onSearch={onSearch} initialValue={get('q')} placeholder={placeholder} />;
}

export function SelectFilter({ param, label, allLabel, options }: {
  param: string;
  label: string;
  allLabel: string;
  options: { value: string; label: string }[];
}) {
  const { get, set } = useUrlFilters();
  return (
    <select value={get(param)} onChange={(event) => set(param, event.target.value)} aria-label={label}>
      <option value="">{allLabel}</option>
      {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select>
  );
}

export function CheckboxFilter({ param, label }: { param: string; label: string }) {
  const { get, set } = useUrlFilters();
  return (
    <label className="online">
      <input type="checkbox" checked={get(param) === 'true'} onChange={(event) => set(param, event.target.checked ? 'true' : '')} /> {label}
    </label>
  );
}
