import { ConfigService } from '@nestjs/config';
import { hashToken } from '../common/utils/token-hash.util';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { AccessTokenService } from './access-token.service';
import { RotationOutcome } from './auth.types';
import { RefreshToken } from './entities/refresh-token.entity';
import { RefreshTokensRepository } from './refresh-tokens.repository';
import { SessionService } from './session.service';

const NOW = Date.now();
const user = { id: 'user-1', tokenVersion: 3, isActive: true } as User;

function row(overrides: Partial<RefreshToken> = {}): RefreshToken {
  return { id: 'row-1', userId: user.id, familyId: 'family-1', tokenVersion: 3, expiresAt: new Date(NOW + 60_000), revokedAt: null, ...overrides } as RefreshToken;
}

function build(found: RefreshToken | null, activeUser: User | null = user, claim = true) {
  const repository = {
    findByHash: jest.fn().mockResolvedValue(found),
    revokeIfActive: jest.fn().mockResolvedValue(claim),
    insert: jest.fn().mockResolvedValue(undefined),
    revokeFamily: jest.fn().mockResolvedValue(undefined),
    deleteExpiredForUser: jest.fn().mockResolvedValue(undefined),
  };
  const accessTokens = { sign: jest.fn().mockResolvedValue('access-token') };
  const users = { findActiveById: jest.fn().mockResolvedValue(activeUser) };
  const config = { get: jest.fn().mockReturnValue(14) } as unknown as ConfigService<never, true>;
  const service = new SessionService(
    repository as unknown as RefreshTokensRepository,
    accessTokens as unknown as AccessTokenService,
    users as unknown as UsersService,
    config,
  );
  return { service, repository };
}

describe('SessionService.rotate', () => {
  it('rotates a valid token within the same family and stores only a hash', async () => {
    const { service, repository } = build(row());
    const result = await service.rotate('raw-token');
    expect(result.outcome).toBe(RotationOutcome.ROTATED);
    expect(repository.findByHash).toHaveBeenCalledWith(hashToken('raw-token'));
    const inserted = repository.insert.mock.calls[0][0];
    expect(inserted.familyId).toBe('family-1');
    expect(inserted.tokenHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('treats unknown and expired tokens as invalid', async () => {
    expect((await build(null).service.rotate('x')).outcome).toBe(RotationOutcome.INVALID);
    const expired = row({ expiresAt: new Date(NOW - 1) });
    expect((await build(expired).service.rotate('x')).outcome).toBe(RotationOutcome.INVALID);
  });

  it('flags a previously revoked token as reuse', async () => {
    const revoked = row({ revokedAt: new Date(NOW - 1000) });
    expect(await build(revoked).service.rotate('x')).toEqual({ outcome: RotationOutcome.REUSED, userId: user.id });
  });

  it('flags a lost claim race as reuse', async () => {
    const { service } = build(row(), user, false);
    expect((await service.rotate('x')).outcome).toBe(RotationOutcome.REUSED);
  });

  it('rejects tokens issued before a token-version bump or for inactive users', async () => {
    expect((await build(row({ tokenVersion: 2 })).service.rotate('x')).outcome).toBe(RotationOutcome.INVALID);
    expect((await build(row(), null).service.rotate('x')).outcome).toBe(RotationOutcome.INVALID);
  });
});
