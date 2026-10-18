import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserTokenType } from '../common/enums/user-token-type.enum';
import { UserToken } from './entities/user-token.entity';

@Injectable()
export class UserTokensRepository {
  constructor(@InjectRepository(UserToken) private readonly repository: Repository<UserToken>) {}

  async insert(data: Pick<UserToken, 'userId' | 'type' | 'tokenHash' | 'expiresAt'>): Promise<void> {
    await this.repository.insert(data);
  }

  async invalidateOutstanding(userId: string, type: UserTokenType): Promise<void> {
    await this.repository
      .createQueryBuilder()
      .update(UserToken)
      .set({ usedAt: () => 'now()' })
      .where('"userId" = :userId AND type = :type AND "usedAt" IS NULL', { userId, type })
      .execute();
  }

  async consume(tokenHash: string, type: UserTokenType): Promise<string | null> {
    const result = await this.repository
      .createQueryBuilder()
      .update(UserToken)
      .set({ usedAt: () => 'now()' })
      .where('"tokenHash" = :tokenHash AND type = :type AND "usedAt" IS NULL AND "expiresAt" > now()', { tokenHash, type })
      .returning('"userId"')
      .execute();
    return (result.raw as { userId: string }[])[0]?.userId ?? null;
  }
}
