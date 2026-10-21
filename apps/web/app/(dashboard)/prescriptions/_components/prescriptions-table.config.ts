import type { SortSpec } from '@/lib/search-params';

/** Plain module (no 'use client') so server pages can read these values; client files only export references. */
export const PRESCRIPTION_SORTABLE = ['patient', 'medication', 'dosage', 'frequency', 'duration', 'doctor', 'createdAt'] as const;
export const PRESCRIPTION_DEFAULT_SORT: SortSpec = { id: 'createdAt', desc: true };
