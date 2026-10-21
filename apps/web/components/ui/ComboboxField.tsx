'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from './combobox';

export interface ComboOption {
  value: string;
  label: string;
  /** Secondary line shown under the label, and also searchable (e.g. an email address). */
  description?: string;
}

interface ComboboxFieldProps {
  label: string;
  /** Submitted with the surrounding <form> (read by `readForm`). */
  name: string;
  required?: boolean;
  placeholder?: string;
  disabled?: boolean;
  /** Fixed list, filtered in the browser. Use for small lists. */
  options?: ComboOption[];
  /** Server-side search. Called with the typed term (empty string = first page of options). */
  fetchOptions?: (term: string) => Promise<ComboOption[]>;
  onValueChange?: (value: string) => void;
}

const SEARCH_DEBOUNCE_MS = 250;
const SEARCH_HINT = 'Type a name, email, phone or ID to search';

const matches = (option: ComboOption, query: string): boolean =>
  `${option.label} ${option.description ?? ''} ${option.value}`.toLowerCase().includes(query.trim().toLowerCase());

/**
 * Searchable single-select for forms. With `fetchOptions` it queries the API as the user types, so it
 * stays usable when there are thousands of records (the list never loads more than one page).
 */
export function ComboboxField({ label, name, required = false, placeholder = 'Search…', disabled, options, fetchOptions, onValueChange }: ComboboxFieldProps) {
  const remote = Boolean(fetchOptions);
  const [selected, setSelected] = useState<ComboOption | null>(null);
  const [results, setResults] = useState<ComboOption[]>([]);
  const [term, setTerm] = useState('');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const latest = useRef(0);
  const fetcher = useRef(fetchOptions);
  fetcher.current = fetchOptions;

  // Only the most recent request may update the list, so slow early responses cannot overwrite newer ones.
  const search = useCallback(async (query: string) => {
    if (!fetcher.current) return;
    const id = ++latest.current;
    setLoading(true);
    try {
      const found = await fetcher.current(query);
      if (id !== latest.current) return;
      setResults(found);
      setFailed(false);
    } catch {
      if (id === latest.current) setFailed(true);
    } finally {
      if (id === latest.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!remote || !open) return;
    const timer = setTimeout(() => void search(term), term ? SEARCH_DEBOUNCE_MS : 0);
    return () => clearTimeout(timer);
  }, [remote, open, term, search]);

  // The selected option must stay in `items`, otherwise the input loses its label when results change.
  const items = useMemo(() => {
    const base = remote ? results : options ?? [];
    return selected && !base.some((item) => item.value === selected.value) ? [selected, ...base] : base;
  }, [remote, results, options, selected]);

  const emptyText = failed ? 'Could not load results. Try again.' : loading ? 'Searching…' : remote && !term ? SEARCH_HINT : 'No matches found';

  return (
    <div className="field combobox-field">
      <span>{label}{required ? ' *' : ''}</span>
      <Combobox<ComboOption>
        items={items}
        value={selected}
        filter={remote ? null : (item, query) => matches(item, query)}
        itemToStringLabel={(item) => item.label}
        isItemEqualToValue={(a, b) => a.value === b.value}
        onValueChange={(next) => {
          setSelected(next);
          onValueChange?.(next?.value ?? '');
        }}
        onInputValueChange={(input, details) => {
          // Picking an item fills the input with its label; that must not trigger a new search.
          if (details.reason === 'input-change' || details.reason === 'clear-press') setTerm(input);
        }}
        onOpenChange={setOpen}
        disabled={disabled}
      >
        <ComboboxInput placeholder={placeholder} showClear={!required} aria-label={label} autoComplete="off" />
        <ComboboxContent>
          <ComboboxEmpty>{emptyText}</ComboboxEmpty>
          <ComboboxList>
            {(item: ComboOption) => (
              <ComboboxItem key={item.value} value={item}>
                <span className="combobox-item-text">
                  <b>{item.label}</b>
                  {item.description && <small>{item.description}</small>}
                </span>
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
      {/* Carries the selected id into FormData and gives native "required" validation. */}
      <input className="combobox-proxy" name={name} required={required} value={selected?.value ?? ''} onChange={() => undefined} tabIndex={-1} aria-hidden />
    </div>
  );
}
