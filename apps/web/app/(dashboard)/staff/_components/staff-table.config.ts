import type { SortSpec } from '@/lib/search-params';

/** Plain module (no 'use client') so server pages can read these values; client files only export references. */
export const STAFF_SORTABLE = ['name', 'role', 'jobTitle', 'email', 'status'] as const;
export const STAFF_DEFAULT_SORT: SortSpec = { id: 'name', desc: false };
