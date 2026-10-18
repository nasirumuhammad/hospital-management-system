import { User } from '../users/entities/user.entity';
import { UserResponse } from '../users/user.mapper';

export interface JwtPayload {
  sub: string;
  tv: number;
}

export interface SessionTokens {
  accessToken: string;
  refreshToken: string;
  refreshExpiresAt: Date;
}

export interface AuthResult {
  user: UserResponse;
  tokens: SessionTokens;
}

export enum RotationOutcome {
  ROTATED = 'ROTATED',
  REUSED = 'REUSED',
  INVALID = 'INVALID',
}

export type RotationResult =
  | { outcome: RotationOutcome.ROTATED; user: User; tokens: SessionTokens }
  | { outcome: RotationOutcome.REUSED; userId: string }
  | { outcome: RotationOutcome.INVALID };
