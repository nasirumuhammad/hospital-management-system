import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaginatedResult } from '../common/interfaces/paginated-result.interface';
import { toContainsPattern } from '../common/utils/escape-like.util';
import { paginate } from '../common/utils/pagination.util';
import { applySort, SortMap } from '../common/utils/sort.util';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { User } from './entities/user.entity';

const SORTABLE: SortMap = {
  name: 'user.name',
  email: 'user.email',
  role: 'user.role',
  status: 'user.isActive',
  emailVerified: 'user.emailVerifiedAt',
  createdAt: 'user.createdAt',
};

const INCREMENT_TOKEN_VERSION = () => '"tokenVersion" + 1';

@Injectable()
export class UsersRepository {
  constructor(@InjectRepository(User) private readonly repository: Repository<User>) {}

  findById(id: string): Promise<User | null> {
    return this.repository.findOneBy({ id });
  }

  findActiveById(id: string): Promise<User | null> {
    return this.repository.findOneBy({ id, isActive: true });
  }

  findActiveByEmail(email: string): Promise<User | null> {
    return this.repository.findOneBy({ email, isActive: true });
  }

  findByEmailWithPassword(email: string): Promise<User | null> {
    return this.withPassword().where('user.email = :email', { email }).getOne();
  }

  findByIdWithPassword(id: string): Promise<User | null> {
    return this.withPassword().where('user.id = :id', { id }).getOne();
  }

  existsByEmail(email: string): Promise<boolean> {
    return this.repository.existsBy({ email });
  }

  create(data: Partial<User>): Promise<User> {
    return this.repository.save(this.repository.create(data));
  }

  search(query: ListUsersQueryDto, hospitalId: string): Promise<PaginatedResult<User>> {
    const builder = this.repository.createQueryBuilder('user').where('user.hospitalId = :hospitalId', { hospitalId });
    if (query.role) builder.andWhere('user.role = :role', { role: query.role });
    if (query.q) {
      builder.andWhere('(user.name ILIKE :pattern OR user.email ILIKE :pattern)', { pattern: toContainsPattern(query.q) });
    }
    applySort(builder, query, SORTABLE, { sortBy: 'createdAt', order: 'desc' }, 'user.id');
    return paginate(builder, query);
  }

  async setActive(id: string, hospitalId: string, isActive: boolean): Promise<void> {
    await this.repository.update({ id, hospitalId }, { isActive });
  }

  async incrementTokenVersion(id: string, hospitalId?: string): Promise<void> {
    await this.repository.update(hospitalId ? { id, hospitalId } : { id }, { tokenVersion: INCREMENT_TOKEN_VERSION });
  }

  async replacePassword(id: string, passwordHash: string, hospitalId?: string): Promise<void> {
    await this.repository.update(hospitalId ? { id, hospitalId } : { id }, { passwordHash, tokenVersion: INCREMENT_TOKEN_VERSION });
  }

  async markEmailVerified(id: string): Promise<void> {
    await this.repository
      .createQueryBuilder()
      .update(User)
      .set({ emailVerifiedAt: () => 'now()' })
      .where('id = :id AND "emailVerifiedAt" IS NULL', { id })
      .execute();
  }

  private withPassword() {
    return this.repository.createQueryBuilder('user').addSelect('user.passwordHash');
  }
}
