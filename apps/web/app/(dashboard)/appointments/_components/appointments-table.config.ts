import type { SortSpec } from '@/lib/search-params';

/** Plain module (no 'use client') so server pages can read these values; client files only export references. */
export const APPOINTMENT_SORTABLE = ['patient', 'doctor', 'scheduledAt', 'reason', 'status'] as const;
export const APPOINTMENT_DEFAULT_SORT: SortSpec = { id: 'scheduledAt', desc: true };
