import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { PaginatedResult } from '../common/interfaces/paginated-result.interface';
import { toContainsPattern } from '../common/utils/escape-like.util';
import { paginate } from '../common/utils/pagination.util';
import { applySort, SortMap } from '../common/utils/sort.util';
import { ListMedicalRecordsQueryDto } from './dto/list-medical-records-query.dto';
import { MedicalRecord } from './entities/medical-record.entity';

export interface RecordScope {
  hospitalId: string;
  patientUserId?: string;
  doctorUserId?: string;
}

const PATIENT_COLUMNS = ['patient.id', 'patient.firstName', 'patient.lastName'];
const DOCTOR_COLUMNS = ['doctor.id', 'doctor.firstName', 'doctor.lastName', 'doctor.specialty'];

const SORTABLE: SortMap = {
  patient: ['patient.lastName', 'patient.firstName'],
  doctor: ['doctor.lastName', 'doctor.firstName'],
  diagnosis: 'r.diagnosis',
  createdAt: 'r.createdAt',
};

@Injectable()
export class MedicalRecordsRepository {
  constructor(@InjectRepository(MedicalRecord) private readonly repository: Repository<MedicalRecord>) {}

  create(data: Partial<MedicalRecord>): MedicalRecord {
    return this.repository.create(data);
  }

  save(record: MedicalRecord): Promise<MedicalRecord> {
    return this.repository.save(record);
  }

  async update(id: string, hospitalId: string, changes: Partial<MedicalRecord>): Promise<void> {
    await this.repository.update({ id, hospitalId }, changes);
  }

  findPlainById(id: string, hospitalId: string): Promise<MedicalRecord | null> {
    return this.repository.findOneBy({ id, hospitalId });
  }

  findOneScoped(id: string, scope: RecordScope): Promise<MedicalRecord | null> {
    return this.scoped(scope).andWhere('r.id = :id', { id }).getOne();
  }

  search(query: ListMedicalRecordsQueryDto, scope: RecordScope): Promise<PaginatedResult<MedicalRecord>> {
    const builder = this.scoped(scope);
    if (query.patientId) builder.andWhere('r.patientId = :patientId', { patientId: query.patientId });
    if (query.q) {
      builder.andWhere(
        `(patient."firstName" || ' ' || patient."lastName" ILIKE :pattern
          OR doctor."firstName" || ' ' || doctor."lastName" ILIKE :pattern
          OR r.diagnosis ILIKE :pattern)`,
        { pattern: toContainsPattern(query.q) },
      );
    }
    applySort(builder, query, SORTABLE, { sortBy: 'createdAt', order: 'desc' }, 'r.id');
    return paginate(builder, query);
  }

  private scoped(scope: RecordScope): SelectQueryBuilder<MedicalRecord> {
    const builder = this.repository
      .createQueryBuilder('r')
      .withDeleted()
      .leftJoin('r.patient', 'patient')
      .addSelect(PATIENT_COLUMNS)
      .leftJoin('r.doctor', 'doctor')
      .addSelect(DOCTOR_COLUMNS)
      .andWhere('r.hospitalId = :hospitalId', { hospitalId: scope.hospitalId });
    if (scope.patientUserId) builder.andWhere('patient.userId = :patientUserId', { patientUserId: scope.patientUserId });
    if (scope.doctorUserId) builder.andWhere('doctor.userId = :doctorUserId', { doctorUserId: scope.doctorUserId });
    return builder;
  }
}
