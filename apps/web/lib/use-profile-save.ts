'use client';
import { useState } from 'react';
import { errorMessage } from './api-client';

/**
 * Saves a patient/doctor record and, when asked, creates its login straight afterwards.
 * If the record is saved but the login fails, the form locks (to avoid a duplicate record)
 * and explains how to finish from the record's row.
 */
export function useProfileSave(label: string, onSaved: () => void) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [partlySaved, setPartlySaved] = useState(false);

  async function save(request: () => Promise<{ id: string }>, afterSave?: (id: string) => Promise<unknown>) {
    setBusy(true);
    setError('');
    const saved = await request().catch((failure: unknown) => {
      setError(errorMessage(failure));
      return null;
    });
    if (!saved) return setBusy(false);
    try {
      await afterSave?.(saved.id);
      onSaved();
    } catch (failure) {
      setError(`${label} saved, but the login was not created: ${errorMessage(failure)}. Fix the problem, then use Create login on the record row.`);
      setPartlySaved(true);
      setBusy(false);
    }
  }

  return { error, busy, partlySaved, save };
}
