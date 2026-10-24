import { UserRole } from '../common/enums/user-role.enum';

/**
 * Roles whose person-record lives in `staff_members`.
 * Doctors and patients keep their own specialised profile tables; SUPER_ADMIN is a platform account with no hospital.
 */
export const STAFF_ROLES: UserRole[] = [
  UserRole.ADMIN,
  UserRole.NURSE,
  UserRole.RECEPTIONIST,
  UserRole.CASHIER,
  UserRole.LAB,
  UserRole.PHARMACIST,
  UserRole.HMO_DESK,
  UserRole.WARD_MANAGER,
];
