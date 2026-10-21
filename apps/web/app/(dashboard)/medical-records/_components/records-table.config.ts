import type { SortSpec } from '@/lib/search-params';

/** Plain module (no 'use client') so server pages can read these values; client files only export references. */
export const RECORD_SORTABLE = ['patient', 'diagnosis', 'doctor', 'createdAt'] as const;
export const RECORD_DEFAULT_SORT: SortSpec = { id: 'createdAt', desc: true };
