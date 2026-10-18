import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaginatedResult } from '../common/interfaces/paginated-result.interface';
import { toContainsPattern } from '../common/utils/escape-like.util';
import { paginate } from '../common/utils/pagination.util';
import { ListPatientsQueryDto } from './dto/list-patients-query.dto';
import { Patient } from './entities/patient.entity';

@Injectable()
export class PatientsRepository {
  constructor(@InjectRepository(Patient) private readonly repository: Repository<Patient>) {}

  findById(id: string): Promise<Patient | null> {
    return this.repository.findOneBy({ id });
  }

  findByUserId(userId: string): Promise<Patient | null> {
    return this.repository.findOneBy({ userId });
  }

  existsByUserId(userId: string): Promise<boolean> {
    return this.repository.existsBy({ userId });
  }

  count(): Promise<number> {
    return this.repository.count();
  }

  save(patient: Patient): Promise<Patient> {
    return this.repository.save(patient);
  }

  create(data: Partial<Patient>): Patient {
    return this.repository.create(data);
  }

  async softDelete(id: string): Promise<void> {
    await this.repository.softDelete({ id });
  }

  search(query: ListPatientsQueryDto): Promise<PaginatedResult<Patient>> {
    const builder = this.repository.createQueryBuilder('patient').orderBy('patient.createdAt', 'DESC');
    if (query.q) {
      builder.andWhere(
        `(patient."firstName" || ' ' || patient."lastName" ILIKE :pattern OR patient.email ILIKE :pattern)`,
        { pattern: toContainsPattern(query.q) },
      );
    }
    return paginate(builder, query);
  }
}
