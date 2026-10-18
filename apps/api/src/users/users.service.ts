import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../common/enums/audit-action.enum';
import { AuditTarget } from '../common/enums/audit-target.enum';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { PaginatedResult } from '../common/interfaces/paginated-result.interface';
import { AccountNotificationsService } from './account-notifications.service';
import { CreateUserDto } from './dto/create-user.dto';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { User } from './entities/user.entity';
import { PasswordService } from './password.service';
import { toUserResponse, UserResponse } from './user.mapper';
import { UsersRepository } from './users.repository';

@Injectable()
export class UsersService {
  constructor(
    private readonly repository: UsersRepository,
    private readonly passwords: PasswordService,
    private readonly notifications: AccountNotificationsService,
    private readonly audit: AuditService,
  ) {}

  findActiveById(id: string): Promise<User | null> {
    return this.repository.findActiveById(id);
  }

  findActiveByEmail(email: string): Promise<User | null> {
    return this.repository.findActiveByEmail(email);
  }

  findByEmailWithPassword(email: string): Promise<User | null> {
    return this.repository.findByEmailWithPassword(email);
  }

  findByIdWithPassword(id: string): Promise<User | null> {
    return this.repository.findByIdWithPassword(id);
  }

  async getByIdOrFail(id: string): Promise<User> {
    const user = await this.repository.findById(id);
    if (!user) throw new NotFoundException('Account not found');
    return user;
  }

  async list(query: ListUsersQueryDto): Promise<PaginatedResult<UserResponse>> {
    const page = await this.repository.search(query);
    return { ...page, items: page.items.map(toUserResponse) };
  }

  async create(dto: CreateUserDto, actor: AuthenticatedUser): Promise<UserResponse> {
    if (await this.repository.existsByEmail(dto.email)) {
      throw new ConflictException('An account with this email already exists');
    }
    const user = await this.repository.create({
      email: dto.email,
      name: dto.name,
      role: dto.role,
      passwordHash: await this.passwords.hash(dto.password),
    });
    await this.audit.record({ actorId: actor.id, action: AuditAction.USER_CREATED, targetType: AuditTarget.USER, targetId: user.id, metadata: { role: user.role } });
    await this.notifications.sendEmailVerification(user);
    return toUserResponse(user);
  }

  async setActive(id: string, isActive: boolean, actor: AuthenticatedUser): Promise<UserResponse> {
    if (id === actor.id) throw new BadRequestException('You cannot change your own account status');
    const user = await this.getByIdOrFail(id);
    await this.repository.setActive(id, isActive);
    if (!isActive) await this.repository.incrementTokenVersion(id);
    await this.audit.record({
      actorId: actor.id,
      action: isActive ? AuditAction.USER_ENABLED : AuditAction.USER_DISABLED,
      targetType: AuditTarget.USER,
      targetId: id,
    });
    return toUserResponse({ ...user, isActive });
  }

  async setPassword(id: string, plainPassword: string): Promise<void> {
    await this.repository.replacePassword(id, await this.passwords.hash(plainPassword));
  }

  incrementTokenVersion(id: string): Promise<void> {
    return this.repository.incrementTokenVersion(id);
  }

  markEmailVerified(id: string): Promise<void> {
    return this.repository.markEmailVerified(id);
  }
}
