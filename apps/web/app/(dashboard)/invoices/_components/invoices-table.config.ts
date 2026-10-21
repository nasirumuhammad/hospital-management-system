import type { SortSpec } from '@/lib/search-params';

/** Plain module (no 'use client') so server pages can read these values; client files only export references. */
export const INVOICE_SORTABLE = ['patient', 'description', 'amount', 'amountPaid', 'dueDate', 'status', 'createdAt'] as const;
export const INVOICE_DEFAULT_SORT: SortSpec = { id: 'createdAt', desc: true };
