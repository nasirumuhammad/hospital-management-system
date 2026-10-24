import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaginatedResult } from '../common/interfaces/paginated-result.interface';
import { toContainsPattern } from '../common/utils/escape-like.util';
import { paginate } from '../common/utils/pagination.util';
import { applySort, SortMap } from '../common/utils/sort.util';
import { ListStaffQueryDto } from './dto/list-staff-query.dto';
import { StaffMember } from './entities/staff-member.entity';

const SORTABLE: SortMap = {
  name: ['staff.lastName', 'staff.firstName'],
  role: 'staff.role',
  jobTitle: 'staff.jobTitle',
  email: 'staff.email',
  status: 'staff.isActive',
};

@Injectable()
export class StaffRepository {
  constructor(@InjectRepository(StaffMember) private readonly repository: Repository<StaffMember>) {}

  findById(id: string, hospitalId: string): Promise<StaffMember | null> {
    return this.repository.findOneBy({ id, hospitalId });
  }

  findByUserId(userId: string, hospitalId: string): Promise<StaffMember | null> {
    return this.repository.findOneBy({ userId, hospitalId });
  }

  findByEmail(email: string, hospitalId: string): Promise<StaffMember | null> {
    return this.repository.findOneBy({ email, hospitalId });
  }

  existsByUserId(userId: string, hospitalId: string): Promise<boolean> {
    return this.repository.existsBy({ userId, hospitalId });
  }

  existsByEmail(email: string, hospitalId: string, exceptId?: string): Promise<boolean> {
    return this.repository
      .createQueryBuilder('staff')
      .where('staff.hospitalId = :hospitalId AND staff.email = :email', { hospitalId, email })
      .andWhere(exceptId ? 'staff.id <> :exceptId' : '1=1', { exceptId })
      .getExists();
  }

  create(data: Partial<StaffMember>): StaffMember {
    return this.repository.create(data);
  }

  save(member: StaffMember): Promise<StaffMember> {
    return this.repository.save(member);
  }

  async softDelete(id: string, hospitalId: string): Promise<void> {
    await this.repository.update({ id, hospitalId }, { isActive: false });
    await this.repository.softDelete({ id, hospitalId });
  }

  search(query: ListStaffQueryDto, includeInactive: boolean, hospitalId: string): Promise<PaginatedResult<StaffMember>> {
    const builder = this.repository.createQueryBuilder('staff').where('staff.hospitalId = :hospitalId', { hospitalId });
    if (!includeInactive) builder.andWhere('staff.isActive = true');
    if (query.role) builder.andWhere('staff.role = :role', { role: query.role });
    if (query.q) {
      builder.andWhere(
        `(staff."firstName" || ' ' || staff."lastName" ILIKE :pattern OR staff."jobTitle" ILIKE :pattern OR staff.email ILIKE :pattern)`,
        { pattern: toContainsPattern(query.q) },
      );
    }
    applySort(builder, query, SORTABLE, { sortBy: 'name', order: 'asc' }, 'staff.id');
    return paginate(builder, query);
  }
}
