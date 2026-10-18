export const BCRYPT_ROUNDS = 12;
export const MIN_PASSWORD_LENGTH = 12;
export const MAX_PASSWORD_BYTES = 72;
export const MAX_LOGIN_PASSWORD_LENGTH = 128;

export const ACCESS_COOKIE_NAME = 'cp_access';
export const REFRESH_COOKIE_NAME = 'cp_refresh';
export const REFRESH_COOKIE_PATH = '/api/auth';

export const PASSWORD_RESET_TTL_MINUTES = 30;
export const EMAIL_VERIFICATION_TTL_HOURS = 48;
export const OPAQUE_TOKEN_BYTES = 48;

export const MS_PER_MINUTE = 60_000;
export const MS_PER_HOUR = 3_600_000;
export const MS_PER_DAY = 86_400_000;

export const LOGIN_THROTTLE = { limit: 10, ttl: MS_PER_MINUTE };
export const SENSITIVE_THROTTLE = { limit: 5, ttl: MS_PER_HOUR };
export const DEFAULT_THROTTLE = { limit: 300, ttl: MS_PER_MINUTE };

export const AUTH_ERROR = {
  INVALID_CREDENTIALS: 'Invalid email or password',
  SESSION_INVALID: 'Your session is invalid or has expired',
  TOKEN_INVALID: 'This link is invalid or has expired',
  CURRENT_PASSWORD_INCORRECT: 'Current password is incorrect',
} as const;

export const ACCESS_TOKEN_ISSUER = 'carepoint-api';
export const JWT_ALGORITHM = 'HS256';
