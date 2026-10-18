import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { PaginatedResult } from '../common/interfaces/paginated-result.interface';
import { paginate } from '../common/utils/pagination.util';
import { ListMedicalRecordsQueryDto } from './dto/list-medical-records-query.dto';
import { MedicalRecord } from './entities/medical-record.entity';

export interface RecordScope {
  patientUserId?: string;
  doctorUserId?: string;
}

const PATIENT_COLUMNS = ['patient.id', 'patient.firstName', 'patient.lastName'];
const DOCTOR_COLUMNS = ['doctor.id', 'doctor.firstName', 'doctor.lastName', 'doctor.specialty'];

@Injectable()
export class MedicalRecordsRepository {
  constructor(@InjectRepository(MedicalRecord) private readonly repository: Repository<MedicalRecord>) {}

  create(data: Partial<MedicalRecord>): MedicalRecord {
    return this.repository.create(data);
  }

  save(record: MedicalRecord): Promise<MedicalRecord> {
    return this.repository.save(record);
  }

  async update(id: string, changes: Partial<MedicalRecord>): Promise<void> {
    await this.repository.update({ id }, changes);
  }

  findPlainById(id: string): Promise<MedicalRecord | null> {
    return this.repository.findOneBy({ id });
  }

  findOneScoped(id: string, scope: RecordScope): Promise<MedicalRecord | null> {
    return this.scoped(scope).andWhere('r.id = :id', { id }).getOne();
  }

  search(query: ListMedicalRecordsQueryDto, scope: RecordScope): Promise<PaginatedResult<MedicalRecord>> {
    const builder = this.scoped(scope).orderBy('r.createdAt', 'DESC');
    if (query.patientId) builder.andWhere('r.patientId = :patientId', { patientId: query.patientId });
    return paginate(builder, query);
  }

  private scoped(scope: RecordScope): SelectQueryBuilder<MedicalRecord> {
    const builder = this.repository
      .createQueryBuilder('r')
      .withDeleted()
      .leftJoin('r.patient', 'patient')
      .addSelect(PATIENT_COLUMNS)
      .leftJoin('r.doctor', 'doctor')
      .addSelect(DOCTOR_COLUMNS);
    if (scope.patientUserId) builder.andWhere('patient.userId = :patientUserId', { patientUserId: scope.patientUserId });
    if (scope.doctorUserId) builder.andWhere('doctor.userId = :doctorUserId', { doctorUserId: scope.doctorUserId });
    return builder;
  }
}
