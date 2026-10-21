import { BadRequestException, ForbiddenException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Hospital } from '../hospitals/entities/hospital.entity';
import { ConfigService } from '@nestjs/config';
import { AuditService } from '../audit/audit.service';
import { AUTH_ERROR } from '../common/constants/auth.constants';
import { AuditAction } from '../common/enums/audit-action.enum';
import { AuditTarget } from '../common/enums/audit-target.enum';
import { UserTokenType } from '../common/enums/user-token-type.enum';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { EnvironmentVariables } from '../config/env.validation';
import { AccountNotificationsService } from '../users/account-notifications.service';
import { User } from '../users/entities/user.entity';
import { PasswordService } from '../users/password.service';
import { UserTokensService } from '../users/user-tokens.service';
import { toUserResponse, UserResponse } from '../users/user.mapper';
import { UsersService } from '../users/users.service';
import { AuthResult, RotationOutcome } from './auth.types';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { SessionService } from './session.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly requireVerifiedEmail: boolean;

  constructor(
    private readonly users: UsersService,
    private readonly passwords: PasswordService,
    private readonly sessions: SessionService,
    private readonly userTokens: UserTokensService,
    private readonly notifications: AccountNotificationsService,
    private readonly audit: AuditService,
    @InjectRepository(Hospital) private readonly hospitals: Repository<Hospital>,
    config: ConfigService<EnvironmentVariables, true>,
  ) {
    this.requireVerifiedEmail = config.get('REQUIRE_EMAIL_VERIFICATION', { infer: true });
  }

  async login(dto: LoginDto): Promise<AuthResult> {
    const user = await this.verifyCredentials(dto);
    if (this.requireVerifiedEmail && !user.emailVerifiedAt) {
      throw new ForbiddenException('Verify your email address before signing in');
    }
    await this.recordAuthAudit(user.hospitalId, { actorId: user.id, action: AuditAction.AUTH_LOGIN, targetType: AuditTarget.USER, targetId: user.id });
    return { user: toUserResponse(user), tokens: await this.sessions.start(user) };
  }

  async refresh(rawRefreshToken: string | undefined): Promise<AuthResult> {
    const result = rawRefreshToken ? await this.sessions.rotate(rawRefreshToken) : { outcome: RotationOutcome.INVALID as const };
    if (result.outcome === RotationOutcome.REUSED) await this.handleTokenReuse(result.userId);
    if (result.outcome !== RotationOutcome.ROTATED) throw new UnauthorizedException(AUTH_ERROR.SESSION_INVALID);
    await this.assertHospitalActive(result.user.hospitalId);
    return { user: toUserResponse(result.user), tokens: result.tokens };
  }

  async logout(rawRefreshToken: string | undefined): Promise<void> {
    if (rawRefreshToken) await this.sessions.endSession(rawRefreshToken);
  }

  async logoutEverywhere(actor: AuthenticatedUser): Promise<void> {
    await this.users.incrementTokenVersion(actor.id);
    await this.recordAuthAudit(actor.hospitalId, { actorId: actor.id, action: AuditAction.AUTH_LOGOUT_ALL, targetType: AuditTarget.USER, targetId: actor.id });
  }

  getProfile(actor: AuthenticatedUser): Promise<UserResponse> {
    return this.users.getByIdOrFail(actor.id).then(toUserResponse);
  }

  async changePassword(actor: AuthenticatedUser, dto: ChangePasswordDto): Promise<AuthResult> {
    const user = await this.users.findByIdWithPassword(actor.id);
    if (!user || !(await this.passwords.compare(dto.currentPassword, user.passwordHash))) {
      throw new BadRequestException(AUTH_ERROR.CURRENT_PASSWORD_INCORRECT);
    }
    if (dto.currentPassword === dto.newPassword) throw new BadRequestException('Choose a password different from the current one');
    await this.users.setPassword(user.id, dto.newPassword);
    await this.recordAuthAudit(user.hospitalId, { actorId: user.id, action: AuditAction.PASSWORD_CHANGED, targetType: AuditTarget.USER, targetId: user.id });
    return this.startFreshSession(user.id);
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await this.users.findActiveByEmail(email);
    if (!user) return;
    await this.notifications.sendPasswordReset(user);
    await this.recordAuthAudit(user.hospitalId, { actorId: user.id, action: AuditAction.PASSWORD_RESET_REQUESTED, targetType: AuditTarget.USER, targetId: user.id });
  }

  async resetPassword(dto: ResetPasswordDto): Promise<void> {
    const userId = await this.userTokens.consume(dto.token, UserTokenType.PASSWORD_RESET);
    if (!userId) throw new BadRequestException(AUTH_ERROR.TOKEN_INVALID);
    await this.users.setPassword(userId, dto.newPassword);
    await this.users.markEmailVerified(userId);
    await this.userTokens.invalidateOutstanding(userId, UserTokenType.PASSWORD_RESET);
    await this.recordAuthAudit((await this.users.getByIdOrFail(userId)).hospitalId, { actorId: userId, action: AuditAction.PASSWORD_RESET_COMPLETED, targetType: AuditTarget.USER, targetId: userId });
    this.logger.warn(`Password reset completed for user ${userId}`);
  }

  async verifyEmail(rawToken: string): Promise<void> {
    const userId = await this.userTokens.consume(rawToken, UserTokenType.EMAIL_VERIFICATION);
    if (!userId) throw new BadRequestException(AUTH_ERROR.TOKEN_INVALID);
    await this.users.markEmailVerified(userId);
    await this.recordAuthAudit((await this.users.getByIdOrFail(userId)).hospitalId, { actorId: userId, action: AuditAction.EMAIL_VERIFIED, targetType: AuditTarget.USER, targetId: userId });
  }

  async resendVerification(actor: AuthenticatedUser): Promise<void> {
    const user = await this.users.getByIdOrFail(actor.id);
    if (!user.emailVerifiedAt) await this.notifications.sendEmailVerification(user);
  }

  private async assertHospitalActive(hospitalId: string | null): Promise<void> {
    if (!hospitalId) return;
    const hospital = await this.hospitals.findOne({ where: { id: hospitalId }, select: { id: true, isActive: true } });
    if (!hospital?.isActive) throw new UnauthorizedException(AUTH_ERROR.SESSION_INVALID);
  }

  private async recordAuthAudit(hospitalId: string | null, entry: Omit<import('../audit/audit.service').AuditEntry, 'hospitalId'>): Promise<void> {
    if (hospitalId) await this.audit.record({ hospitalId, ...entry });
    else await this.audit.recordPlatform(entry);
  }

  private async verifyCredentials(dto: LoginDto): Promise<User> {
    const user = await this.users.findByEmailWithPassword(dto.email);
    if (!user) {
      await this.passwords.spendComparisonTime(dto.password);
      throw new UnauthorizedException(AUTH_ERROR.INVALID_CREDENTIALS);
    }
    const passwordMatches = await this.passwords.compare(dto.password, user.passwordHash);
    let hospitalActive = true;
    if (user.hospitalId) { const hospital = await this.hospitals.findOne({ where: { id: user.hospitalId }, select: { id: true, isActive: true } }); hospitalActive = Boolean(hospital?.isActive); }
    if (!passwordMatches || !user.isActive || !hospitalActive) {
      await this.recordAuthAudit(user.hospitalId, { actorId: user.id, action: AuditAction.AUTH_LOGIN_FAILED, targetType: AuditTarget.USER, targetId: user.id });
      throw new UnauthorizedException(AUTH_ERROR.INVALID_CREDENTIALS);
    }
    return user;
  }

  private async handleTokenReuse(userId: string): Promise<void> {
    await this.users.incrementTokenVersion(userId);
    await this.recordAuthAudit((await this.users.getByIdOrFail(userId)).hospitalId, { actorId: userId, action: AuditAction.AUTH_REFRESH_REUSE_DETECTED, targetType: AuditTarget.USER, targetId: userId });
    this.logger.warn(`Refresh token reuse detected; all sessions revoked for user ${userId}`);
  }

  private async startFreshSession(userId: string): Promise<AuthResult> {
    const user = await this.users.getByIdOrFail(userId);
    return { user: toUserResponse(user), tokens: await this.sessions.start(user) };
  }
}
