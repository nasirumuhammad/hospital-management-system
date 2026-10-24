import { ProfileType } from '../common/enums/profile-type.enum';
import { UserRole } from '../common/enums/user-role.enum';

/** Patient and doctor profiles map to exactly one role. Staff profiles carry their own role (see StaffMember.role). */
export const FIXED_ROLE_FOR_PROFILE: Partial<Record<ProfileType, UserRole>> = {
  [ProfileType.PATIENT]: UserRole.PATIENT,
  [ProfileType.DOCTOR]: UserRole.DOCTOR,
};
