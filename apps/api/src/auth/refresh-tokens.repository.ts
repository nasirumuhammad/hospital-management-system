import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { RefreshToken } from './entities/refresh-token.entity';

@Injectable()
export class RefreshTokensRepository {
  constructor(@InjectRepository(RefreshToken) private readonly repository: Repository<RefreshToken>) {}

  findByHash(tokenHash: string): Promise<RefreshToken | null> {
    return this.repository.findOneBy({ tokenHash });
  }

  async insert(data: Omit<RefreshToken, 'id' | 'createdAt' | 'revokedAt' | 'user'>): Promise<void> {
    await this.repository.insert(data);
  }

  async revokeIfActive(id: string): Promise<boolean> {
    const result = await this.repository
      .createQueryBuilder()
      .update(RefreshToken)
      .set({ revokedAt: () => 'now()' })
      .where('id = :id AND "revokedAt" IS NULL', { id })
      .execute();
    return result.affected === 1;
  }

  async revokeFamily(familyId: string): Promise<void> {
    await this.repository
      .createQueryBuilder()
      .update(RefreshToken)
      .set({ revokedAt: () => 'now()' })
      .where('"familyId" = :familyId AND "revokedAt" IS NULL', { familyId })
      .execute();
  }

  async deleteExpiredForUser(userId: string): Promise<void> {
    await this.repository.delete({ userId, expiresAt: LessThan(new Date()) });
  }
}
