import type { SortSpec } from '@/lib/search-params';

/** Plain module (no 'use client') so server pages can read these values; client files only export references. */
export const DOCTOR_SORTABLE = ['name', 'specialty', 'email', 'qualification', 'status'] as const;
export const DOCTOR_DEFAULT_SORT: SortSpec = { id: 'name', desc: false };
