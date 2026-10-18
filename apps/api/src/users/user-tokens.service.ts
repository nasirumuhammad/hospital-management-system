import { Injectable } from '@nestjs/common';
import { UserTokenType } from '../common/enums/user-token-type.enum';
import { generateOpaqueToken, hashToken } from '../common/utils/token-hash.util';
import { USER_TOKEN_TTL_MS } from './user-token.constants';
import { UserTokensRepository } from './user-tokens.repository';

@Injectable()
export class UserTokensService {
  constructor(private readonly repository: UserTokensRepository) {}

  async issue(userId: string, type: UserTokenType): Promise<string> {
    await this.repository.invalidateOutstanding(userId, type);
    const rawToken = generateOpaqueToken();
    const expiresAt = new Date(Date.now() + USER_TOKEN_TTL_MS[type]);
    await this.repository.insert({ userId, type, tokenHash: hashToken(rawToken), expiresAt });
    return rawToken;
  }

  consume(rawToken: string, type: UserTokenType): Promise<string | null> {
    return this.repository.consume(hashToken(rawToken), type);
  }

  invalidateOutstanding(userId: string, type: UserTokenType): Promise<void> {
    return this.repository.invalidateOutstanding(userId, type);
  }
}
