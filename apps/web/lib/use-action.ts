'use client';
import { useRouter } from 'next/navigation';
import { useCallback, useState, useTransition } from 'react';
import { errorMessage } from './api-client';

/**
 * Runs a mutation from the browser, then re-renders the current server page
 * (`router.refresh()`) so the list reflects the change.
 */
export function useRefreshAction() {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [error, setError] = useState('');

  const refresh = useCallback(() => startTransition(() => router.refresh()), [router]);

  const run = useCallback(async (action: () => Promise<unknown>) => {
    setError('');
    try {
      await action();
      refresh();
    } catch (failure) {
      setError(errorMessage(failure));
    }
  }, [refresh]);

  return { error, setError, run, refresh };
}
