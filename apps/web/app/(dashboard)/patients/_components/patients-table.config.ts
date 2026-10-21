import type { SortSpec } from '@/lib/search-params';

/** Plain module (no 'use client') so server pages can read these values; client files only export references. */
export const PATIENT_SORTABLE = ['name', 'email', 'phone', 'gender', 'dateOfBirth', 'createdAt'] as const;
export const PATIENT_DEFAULT_SORT: SortSpec = { id: 'createdAt', desc: true };
