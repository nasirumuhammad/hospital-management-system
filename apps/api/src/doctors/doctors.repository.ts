import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaginatedResult } from '../common/interfaces/paginated-result.interface';
import { toContainsPattern } from '../common/utils/escape-like.util';
import { paginate } from '../common/utils/pagination.util';
import { applySort, SortMap } from '../common/utils/sort.util';
import { ListDoctorsQueryDto } from './dto/list-doctors-query.dto';
import { Doctor } from './entities/doctor.entity';

const SORTABLE: SortMap = {
  name: ['doctor.lastName', 'doctor.firstName'],
  specialty: 'doctor.specialty',
  email: 'doctor.email',
  qualification: 'doctor.qualification',
  status: 'doctor.isActive',
};

@Injectable()
export class DoctorsRepository {
  constructor(@InjectRepository(Doctor) private readonly repository: Repository<Doctor>) {}

  findById(id: string, hospitalId: string): Promise<Doctor | null> {
    return this.repository.findOneBy({ id, hospitalId });
  }

  findActiveById(id: string, hospitalId: string): Promise<Doctor | null> {
    return this.repository.findOneBy({ id, hospitalId, isActive: true });
  }

  findByUserId(userId: string, hospitalId: string): Promise<Doctor | null> {
    return this.repository.findOneBy({ userId, hospitalId });
  }

  existsByUserId(userId: string, hospitalId: string): Promise<boolean> {
    return this.repository.existsBy({ userId, hospitalId });
  }

  countActive(hospitalId: string): Promise<number> {
    return this.repository.countBy({ isActive: true, hospitalId });
  }

  create(data: Partial<Doctor>): Doctor {
    return this.repository.create(data);
  }

  save(doctor: Doctor): Promise<Doctor> {
    return this.repository.save(doctor);
  }

  async softDelete(id: string, hospitalId: string): Promise<void> {
    await this.repository.update({ id, hospitalId }, { isActive: false });
    await this.repository.softDelete({ id, hospitalId });
  }

  search(query: ListDoctorsQueryDto, includeInactive: boolean, hospitalId: string): Promise<PaginatedResult<Doctor>> {
    const builder = this.repository.createQueryBuilder('doctor').where('doctor.hospitalId = :hospitalId', { hospitalId });
    if (!includeInactive) builder.andWhere('doctor.isActive = true');
    if (query.q) {
      builder.andWhere(
        `(doctor."firstName" || ' ' || doctor."lastName" ILIKE :pattern OR doctor.specialty ILIKE :pattern OR doctor.email ILIKE :pattern)`,
        { pattern: toContainsPattern(query.q) },
      );
    }
    applySort(builder, query, SORTABLE, { sortBy: 'name', order: 'asc' }, 'doctor.id');
    return paginate(builder, query);
  }
}
