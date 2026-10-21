import { ProfileType } from '../common/enums/profile-type.enum';
import { UserRole } from '../common/enums/user-role.enum';

export const ROLE_FOR_PROFILE: Record<ProfileType, UserRole> = {
  [ProfileType.PATIENT]: UserRole.PATIENT,
  [ProfileType.DOCTOR]: UserRole.DOCTOR,
};
