'use client';
import { useState } from 'react';
import { api } from '@/lib/api-client';
import { formatMoney } from '@/lib/format';
import { useRefreshAction } from '@/lib/use-action';

/** Inline price editor for catalogue rows (drugs and lab tests). Prices are copied onto invoices when generated. */
export function PriceForm({ path, current }: { path: string; current: string | null }) {
  const { run, error } = useRefreshAction();
  const [price, setPrice] = useState(current ?? '');
  return (
    <form className="inline-operation-form" onSubmit={(event) => { event.preventDefault(); void run(() => api(path, { method: 'PATCH', body: { price: Number(price) } })); }}>
      <span>{current === null ? 'Not priced' : formatMoney(current)}</span>
      <input required aria-label="Price" type="number" min="0" step="0.01" value={price} onChange={(event) => setPrice(event.target.value)} placeholder="Price" />
      <button className="btn secondary small" type="submit">Set price</button>
      {error && <small role="alert">{error}</small>}
    </form>
  );
}
