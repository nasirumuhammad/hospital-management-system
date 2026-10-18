'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Paginated } from '@healthcare/types';
import { api, errorMessage } from './api-client';

type Query = Record<string, string | number | boolean | undefined>;

export function useList<T>(path: string | null, query: Query = {}) {
  const [data, setData] = useState<Paginated<T> | null>(null);
  const [loading, setLoading] = useState(Boolean(path));
  const [error, setError] = useState('');
  const latestRequest = useRef(0);
  const queryKey = JSON.stringify(query);

  const load = useCallback(async () => {
    if (!path) return;
    const requestId = ++latestRequest.current;
    setLoading(true);
    try {
      const result = await api<Paginated<T>>(path, { query: JSON.parse(queryKey) as Query });
      if (requestId === latestRequest.current) {
        setData(result);
        setError('');
      }
    } catch (failure) {
      if (requestId === latestRequest.current) setError(errorMessage(failure, 'Could not load records'));
    } finally {
      if (requestId === latestRequest.current) setLoading(false);
    }
  }, [path, queryKey]);

  useEffect(() => {
    void load();
  }, [load]);

  return { data, items: data?.items ?? [], loading, error, setError, reload: load };
}
