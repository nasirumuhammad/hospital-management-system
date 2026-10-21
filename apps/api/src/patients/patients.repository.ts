import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaginatedResult } from '../common/interfaces/paginated-result.interface';
import { toContainsPattern } from '../common/utils/escape-like.util';
import { paginate } from '../common/utils/pagination.util';
import { applySort, SortMap } from '../common/utils/sort.util';
import { ListPatientsQueryDto } from './dto/list-patients-query.dto';
import { Patient } from './entities/patient.entity';

const SORTABLE: SortMap = {
  name: ['patient.lastName', 'patient.firstName'],
  email: 'patient.email',
  phone: 'patient.phone',
  gender: 'patient.gender',
  dateOfBirth: 'patient.dateOfBirth',
  createdAt: 'patient.createdAt',
};

@Injectable()
export class PatientsRepository {
  constructor(@InjectRepository(Patient) private readonly repository: Repository<Patient>) {}

  findById(id: string, hospitalId: string): Promise<Patient | null> {
    return this.repository.findOneBy({ id, hospitalId });
  }

  findByUserId(userId: string, hospitalId: string): Promise<Patient | null> {
    return this.repository.findOneBy({ userId, hospitalId });
  }

  existsByUserId(userId: string, hospitalId: string): Promise<boolean> {
    return this.repository.existsBy({ userId, hospitalId });
  }

  count(hospitalId: string): Promise<number> {
    return this.repository.countBy({ hospitalId });
  }

  save(patient: Patient): Promise<Patient> {
    return this.repository.save(patient);
  }

  create(data: Partial<Patient>): Patient {
    return this.repository.create(data);
  }

  async softDelete(id: string, hospitalId: string): Promise<void> {
    await this.repository.softDelete({ id, hospitalId });
  }

  search(query: ListPatientsQueryDto, hospitalId: string): Promise<PaginatedResult<Patient>> {
    const builder = this.repository.createQueryBuilder('patient').where('patient.hospitalId = :hospitalId', { hospitalId });
    if (query.gender) builder.andWhere('patient.gender = :gender', { gender: query.gender });
    if (query.q) {
      builder.andWhere(
        `(patient."firstName" || ' ' || patient."lastName" ILIKE :pattern
          OR patient.email ILIKE :pattern
          OR patient.phone ILIKE :pattern
          OR patient.id::text ILIKE :pattern)`,
        { pattern: toContainsPattern(query.q) },
      );
    }
    applySort(builder, query, SORTABLE, { sortBy: 'createdAt', order: 'desc' }, 'patient.id');
    return paginate(builder, query);
  }
}
