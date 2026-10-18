import type { UserRole } from '@healthcare/types';

export interface NavEntry {
  href: string;
  label: string;
  icon: 'overview' | 'appointments' | 'patients' | 'doctors' | 'records' | 'prescriptions' | 'invoices' | 'accounts' | 'audit' | 'settings';
  roles: UserRole[];
}

const ALL: UserRole[] = ['ADMIN', 'DOCTOR', 'PATIENT'];

export const NAV_ENTRIES: NavEntry[] = [
  { href: '/', label: 'Overview', icon: 'overview', roles: ALL },
  { href: '/appointments', label: 'Appointments', icon: 'appointments', roles: ALL },
  { href: '/patients', label: 'Patients', icon: 'patients', roles: ['ADMIN', 'DOCTOR'] },
  { href: '/doctors', label: 'Doctors', icon: 'doctors', roles: ALL },
  { href: '/medical-records', label: 'Medical records', icon: 'records', roles: ALL },
  { href: '/prescriptions', label: 'Prescriptions', icon: 'prescriptions', roles: ALL },
  { href: '/invoices', label: 'Invoices', icon: 'invoices', roles: ['ADMIN', 'PATIENT'] },
  { href: '/accounts', label: 'Accounts', icon: 'accounts', roles: ['ADMIN'] },
  { href: '/audit-logs', label: 'Audit log', icon: 'audit', roles: ['ADMIN'] },
  { href: '/settings', label: 'Settings', icon: 'settings', roles: ALL },
];
