import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { MS_PER_DAY } from '../common/constants/auth.constants';
import { generateOpaqueToken, hashToken } from '../common/utils/token-hash.util';
import { EnvironmentVariables } from '../config/env.validation';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { AccessTokenService } from './access-token.service';
import { RotationOutcome, RotationResult, SessionTokens } from './auth.types';
import { RefreshToken } from './entities/refresh-token.entity';
import { RefreshTokensRepository } from './refresh-tokens.repository';

@Injectable()
export class SessionService {
  private readonly refreshTtlMs: number;

  constructor(
    private readonly repository: RefreshTokensRepository,
    private readonly accessTokens: AccessTokenService,
    private readonly users: UsersService,
    config: ConfigService<EnvironmentVariables, true>,
  ) {
    this.refreshTtlMs = config.get('REFRESH_TOKEN_TTL_DAYS', { infer: true }) * MS_PER_DAY;
  }

  async start(user: User): Promise<SessionTokens> {
    await this.repository.deleteExpiredForUser(user.id);
    return this.issue(user, randomUUID());
  }

  async rotate(rawToken: string): Promise<RotationResult> {
    const current = await this.repository.findByHash(hashToken(rawToken));
    if (!current || current.expiresAt <= new Date()) return { outcome: RotationOutcome.INVALID };
    if (current.revokedAt) return { outcome: RotationOutcome.REUSED, userId: current.userId };
    const user = await this.users.findActiveById(current.userId);
    if (!user || user.tokenVersion !== current.tokenVersion) return { outcome: RotationOutcome.INVALID };
    if (!(await this.repository.revokeIfActive(current.id))) {
      return { outcome: RotationOutcome.REUSED, userId: current.userId };
    }
    return { outcome: RotationOutcome.ROTATED, user, tokens: await this.issue(user, current.familyId) };
  }

  async endSession(rawToken: string): Promise<void> {
    const current = await this.repository.findByHash(hashToken(rawToken));
    if (current) await this.repository.revokeFamily(current.familyId);
  }

  private async issue(user: User, familyId: string): Promise<SessionTokens> {
    const refreshToken = generateOpaqueToken();
    const refreshExpiresAt = new Date(Date.now() + this.refreshTtlMs);
    await this.repository.insert(this.toRow(user, familyId, refreshToken, refreshExpiresAt));
    return { accessToken: await this.accessTokens.sign(user), refreshToken, refreshExpiresAt };
  }

  private toRow(user: User, familyId: string, rawToken: string, expiresAt: Date): Omit<RefreshToken, 'id' | 'createdAt' | 'revokedAt' | 'user'> {
    return { userId: user.id, familyId, tokenHash: hashToken(rawToken), tokenVersion: user.tokenVersion, expiresAt };
  }
}
