import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaginatedResult } from '../common/interfaces/paginated-result.interface';
import { toContainsPattern } from '../common/utils/escape-like.util';
import { paginate } from '../common/utils/pagination.util';
import { ListDoctorsQueryDto } from './dto/list-doctors-query.dto';
import { Doctor } from './entities/doctor.entity';

@Injectable()
export class DoctorsRepository {
  constructor(@InjectRepository(Doctor) private readonly repository: Repository<Doctor>) {}

  findById(id: string): Promise<Doctor | null> {
    return this.repository.findOneBy({ id });
  }

  findActiveById(id: string): Promise<Doctor | null> {
    return this.repository.findOneBy({ id, isActive: true });
  }

  findByUserId(userId: string): Promise<Doctor | null> {
    return this.repository.findOneBy({ userId });
  }

  existsByUserId(userId: string): Promise<boolean> {
    return this.repository.existsBy({ userId });
  }

  countActive(): Promise<number> {
    return this.repository.countBy({ isActive: true });
  }

  create(data: Partial<Doctor>): Doctor {
    return this.repository.create(data);
  }

  save(doctor: Doctor): Promise<Doctor> {
    return this.repository.save(doctor);
  }

  async softDelete(id: string): Promise<void> {
    await this.repository.update({ id }, { isActive: false });
    await this.repository.softDelete({ id });
  }

  search(query: ListDoctorsQueryDto, includeInactive: boolean): Promise<PaginatedResult<Doctor>> {
    const builder = this.repository.createQueryBuilder('doctor').orderBy('doctor.lastName', 'ASC').addOrderBy('doctor.firstName', 'ASC');
    if (!includeInactive) builder.andWhere('doctor.isActive = true');
    if (query.q) {
      builder.andWhere(
        `(doctor."firstName" || ' ' || doctor."lastName" ILIKE :pattern OR doctor.specialty ILIKE :pattern)`,
        { pattern: toContainsPattern(query.q) },
      );
    }
    return paginate(builder, query);
  }
}
