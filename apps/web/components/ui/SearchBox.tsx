'use client';
import { Search } from 'lucide-react';
import { useEffect, useState } from 'react';

const DEBOUNCE_MS = 300;

export function SearchBox({ onSearch, placeholder = 'Search records...', initialValue = '' }: { onSearch: (term: string) => void; placeholder?: string; initialValue?: string }) {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    const timer = setTimeout(() => onSearch(value.trim()), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [value, onSearch]);

  return (
    <label className="search-box">
      <Search size={16} />
      <input value={value} onChange={(event) => setValue(event.target.value)} placeholder={placeholder} aria-label="Search" />
    </label>
  );
}
