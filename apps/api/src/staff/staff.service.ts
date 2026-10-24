import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../common/enums/audit-action.enum';
import { AuditTarget } from '../common/enums/audit-target.enum';
import { UserRole } from '../common/enums/user-role.enum';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { PaginatedResult } from '../common/interfaces/paginated-result.interface';
import { assertNoNulls } from '../common/utils/assert-no-nulls.util';
import { CreateStaffMemberDto } from './dto/create-staff-member.dto';
import { ListStaffQueryDto } from './dto/list-staff-query.dto';
import { UpdateStaffMemberDto } from './dto/update-staff-member.dto';
import { StaffMember } from './entities/staff-member.entity';
import { StaffRepository } from './staff.repository';

const REQUIRED_FIELDS: (keyof UpdateStaffMemberDto)[] = ['firstName', 'lastName', 'email', 'role', 'isActive'];

@Injectable()
export class StaffService {
  constructor(
    private readonly repository: StaffRepository,
    private readonly audit: AuditService,
  ) {}

  list(query: ListStaffQueryDto, actor: AuthenticatedUser): Promise<PaginatedResult<StaffMember>> {
    return this.repository.search(query, query.includeInactive === true, this.requireHospital(actor));
  }

  async findOrFail(id: string, actor: AuthenticatedUser): Promise<StaffMember> {
    const member = await this.repository.findById(id, this.requireHospital(actor));
    if (!member) throw new NotFoundException('Staff member not found');
    return member;
  }

  async create(dto: CreateStaffMemberDto, actor: AuthenticatedUser): Promise<StaffMember> {
    const hospitalId = this.requireHospital(actor);
    await this.assertEmailFree(dto.email, hospitalId);
    const saved = await this.repository.save(this.repository.create({ ...dto, hospitalId }));
    await this.record(AuditAction.STAFF_CREATED, actor, saved.id, { role: saved.role });
    return saved;
  }

  async update(id: string, dto: UpdateStaffMemberDto, actor: AuthenticatedUser): Promise<StaffMember> {
    assertNoNulls(dto, REQUIRED_FIELDS);
    const member = await this.findOrFail(id, actor);
    if (dto.role && dto.role !== member.role && member.userId) {
      throw new ConflictException('This person has a login. Delete the account first, then change their role.');
    }
    if (dto.email && dto.email !== member.email) await this.assertEmailFree(dto.email, member.hospitalId, id);
    const saved = await this.repository.save(Object.assign(member, dto));
    await this.record(AuditAction.STAFF_UPDATED, actor, id);
    return saved;
  }

  async remove(id: string, actor: AuthenticatedUser): Promise<void> {
    const member = await this.findOrFail(id, actor);
    if (member.userId) throw new ConflictException('This person still has a login. Delete or disable the account first.');
    await this.repository.softDelete(id, this.requireHospital(actor));
    await this.record(AuditAction.STAFF_DELETED, actor, id);
  }

  /** An account created directly with a staff role gets its person record straight away, so no staff login exists without one. */
  async createForAccount(account: { id: string; name: string; email: string; role: UserRole }, actor: AuthenticatedUser): Promise<StaffMember> {
    const hospitalId = this.requireHospital(actor);
    const existing = await this.repository.findByEmail(account.email, hospitalId);
    if (existing && !existing.userId && existing.role === account.role) return this.linkUser(existing.id, account.id, actor);
    const [firstName, ...rest] = account.name.trim().split(/\s+/);
    const saved = await this.repository.save(this.repository.create({
      hospitalId, firstName, lastName: rest.join(' ') || '-', email: account.email, role: account.role, userId: account.id,
    }));
    await this.record(AuditAction.STAFF_CREATED, actor, saved.id, { role: saved.role, fromAccount: account.id });
    return saved;
  }

  /** Called by the account-linking flow; the account's role has already been checked against `member.role`. */
  async linkUser(staffId: string, userId: string, actor: AuthenticatedUser): Promise<StaffMember> {
    const member = await this.findOrFail(staffId, actor);
    if (member.userId && member.userId !== userId) throw new ConflictException('Staff profile is already linked');
    if (await this.repository.existsByUserId(userId, this.requireHospital(actor))) throw new ConflictException('This account already has a staff profile');
    member.userId = userId;
    const saved = await this.repository.save(member);
    await this.record(AuditAction.PROFILE_LINKED, actor, staffId, { userId });
    return saved;
  }

  private async assertEmailFree(email: string, hospitalId: string, exceptId?: string): Promise<void> {
    if (await this.repository.existsByEmail(email, hospitalId, exceptId)) {
      throw new BadRequestException('A staff member with this email already exists');
    }
  }

  private requireHospital(actor: AuthenticatedUser): string {
    if (!actor.hospitalId) throw new NotFoundException('A hospital must be selected for this operation');
    return actor.hospitalId;
  }

  private record(action: AuditAction, actor: AuthenticatedUser, targetId: string, metadata?: Record<string, unknown>) {
    return this.audit.record({ hospitalId: this.requireHospital(actor), actorId: actor.id, action, targetType: AuditTarget.STAFF, targetId, metadata });
  }
}
