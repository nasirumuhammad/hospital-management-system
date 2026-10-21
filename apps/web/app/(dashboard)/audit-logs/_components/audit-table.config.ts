import type { SortSpec } from '@/lib/search-params';

/** Plain module (no 'use client') so server pages can read these values; client files only export references. */
export const AUDIT_SORTABLE = ['createdAt', 'action', 'targetType'] as const;
export const AUDIT_DEFAULT_SORT: SortSpec = { id: 'createdAt', desc: true };
export const AUDIT_PAGE_SIZE = 25;
