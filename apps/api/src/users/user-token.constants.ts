import {
  ACCOUNT_INVITATION_TTL_HOURS,
  EMAIL_VERIFICATION_TTL_HOURS,
  MS_PER_HOUR,
  MS_PER_MINUTE,
  PASSWORD_RESET_TTL_MINUTES,
} from '../common/constants/auth.constants';
import { UserTokenType } from '../common/enums/user-token-type.enum';

export const USER_TOKEN_TTL_MS: Record<UserTokenType, number> = {
  [UserTokenType.PASSWORD_RESET]: PASSWORD_RESET_TTL_MINUTES * MS_PER_MINUTE,
  [UserTokenType.EMAIL_VERIFICATION]: EMAIL_VERIFICATION_TTL_HOURS * MS_PER_HOUR,
};

// An invitation is a password-reset token with a longer lifetime; the flag lets the web page word itself as a first-time setup.
export const ACCOUNT_INVITATION_TTL_MS = ACCOUNT_INVITATION_TTL_HOURS * MS_PER_HOUR;
export const INVITATION_LINK_PARAM = 'invited=1';

export const USER_TOKEN_LINK_PATH: Record<UserTokenType, string> = {
  [UserTokenType.PASSWORD_RESET]: 'reset-password',
  [UserTokenType.EMAIL_VERIFICATION]: 'verify-email',
};
