import type { UserRole } from '@healthcare/types';

export interface NavEntry {
  href: string;
  label: string;
  icon: 'overview' | 'appointments' | 'patients' | 'doctors' | 'records' | 'prescriptions' | 'invoices' | 'accounts' | 'audit' | 'settings' | 'visits' | 'laboratory' | 'pharmacy' | 'inpatient' | 'maternity' | 'reports' | 'platform' | 'billing';
  roles: UserRole[];
}

const ALL: UserRole[] = ['ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST', 'CASHIER', 'LAB', 'PHARMACIST', 'HMO_DESK', 'WARD_MANAGER', 'PATIENT'];

export const NAV_ENTRIES: NavEntry[] = [
  { href: '/', label: 'Overview', icon: 'overview', roles: ALL },
  { href: '/platform/hospitals', label: 'Platform hospitals', icon: 'platform', roles: ['SUPER_ADMIN'] },
  { href: '/appointments', label: 'Appointments', icon: 'appointments', roles: ['ADMIN', 'DOCTOR', 'PATIENT', 'RECEPTIONIST'] },
  { href: '/visits', label: 'Visits & queue', icon: 'visits', roles: ['ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST'] },
  { href: '/patients', label: 'Patients', icon: 'patients', roles: ['ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST'] },
  { href: '/doctors', label: 'Doctors', icon: 'doctors', roles: ALL },
  { href: '/medical-records', label: 'Medical records', icon: 'records', roles: ['ADMIN', 'DOCTOR', 'NURSE', 'PATIENT'] },
  { href: '/prescriptions', label: 'Prescriptions', icon: 'prescriptions', roles: ['ADMIN', 'DOCTOR', 'PATIENT', 'PHARMACIST'] },
  { href: '/laboratory', label: 'Laboratory', icon: 'laboratory', roles: ['ADMIN', 'DOCTOR', 'LAB'] },
  { href: '/pharmacy', label: 'Pharmacy', icon: 'pharmacy', roles: ['ADMIN', 'DOCTOR', 'PHARMACIST'] },
  { href: '/inpatient', label: 'Inpatient', icon: 'inpatient', roles: ['ADMIN', 'DOCTOR', 'NURSE', 'WARD_MANAGER'] },
  { href: '/maternity', label: 'Maternity', icon: 'maternity', roles: ['ADMIN', 'DOCTOR', 'NURSE'] },
  { href: '/billing', label: 'Billing operations', icon: 'billing', roles: ['ADMIN', 'CASHIER', 'HMO_DESK'] },
  { href: '/invoices', label: 'Invoices', icon: 'invoices', roles: ['ADMIN', 'PATIENT', 'CASHIER', 'HMO_DESK'] },
  { href: '/reports', label: 'Reports', icon: 'reports', roles: ['ADMIN'] },
  { href: '/accounts', label: 'Accounts', icon: 'accounts', roles: ['ADMIN'] },
  { href: '/audit-logs', label: 'Audit log', icon: 'audit', roles: ['ADMIN'] },
  { href: '/settings', label: 'Settings', icon: 'settings', roles: ALL },
];
