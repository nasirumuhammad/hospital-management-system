import type { SortSpec } from '@/lib/search-params';

/** Plain module (no 'use client') so server pages can read these values; client files only export references. */
export const ACCOUNT_SORTABLE = ['name', 'email', 'role', 'emailVerified', 'status', 'createdAt'] as const;
export const ACCOUNT_DEFAULT_SORT: SortSpec = { id: 'createdAt', desc: true };
