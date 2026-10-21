import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { PaginatedResult } from '../common/interfaces/paginated-result.interface';
import { toContainsPattern } from '../common/utils/escape-like.util';
import { paginate } from '../common/utils/pagination.util';
import { applySort, SortMap } from '../common/utils/sort.util';
import { ListPrescriptionsQueryDto } from './dto/list-prescriptions-query.dto';
import { Prescription } from './entities/prescription.entity';

export interface PrescriptionScope {
  hospitalId: string;
  patientUserId?: string;
  doctorUserId?: string;
}

const PATIENT_COLUMNS = ['patient.id', 'patient.firstName', 'patient.lastName'];
const DOCTOR_COLUMNS = ['doctor.id', 'doctor.firstName', 'doctor.lastName', 'doctor.specialty'];

const SORTABLE: SortMap = {
  patient: ['patient.lastName', 'patient.firstName'],
  doctor: ['doctor.lastName', 'doctor.firstName'],
  medication: 'p.medication',
  dosage: 'p.dosage',
  frequency: 'p.frequency',
  duration: 'p.duration',
  createdAt: 'p.createdAt',
};

@Injectable()
export class PrescriptionsRepository {
  constructor(@InjectRepository(Prescription) private readonly repository: Repository<Prescription>) {}

  create(data: Partial<Prescription>): Prescription {
    return this.repository.create(data);
  }

  save(prescription: Prescription): Promise<Prescription> {
    return this.repository.save(prescription);
  }

  findOneScoped(id: string, scope: PrescriptionScope): Promise<Prescription | null> {
    return this.scoped(scope).andWhere('p.id = :id', { id }).getOne();
  }

  search(query: ListPrescriptionsQueryDto, scope: PrescriptionScope): Promise<PaginatedResult<Prescription>> {
    const builder = this.scoped(scope);
    if (query.patientId) builder.andWhere('p.patientId = :patientId', { patientId: query.patientId });
    if (query.q) {
      builder.andWhere(
        `(patient."firstName" || ' ' || patient."lastName" ILIKE :pattern
          OR doctor."firstName" || ' ' || doctor."lastName" ILIKE :pattern
          OR p.medication ILIKE :pattern)`,
        { pattern: toContainsPattern(query.q) },
      );
    }
    applySort(builder, query, SORTABLE, { sortBy: 'createdAt', order: 'desc' }, 'p.id');
    return paginate(builder, query);
  }

  private scoped(scope: PrescriptionScope): SelectQueryBuilder<Prescription> {
    const builder = this.repository
      .createQueryBuilder('p')
      .withDeleted()
      .leftJoin('p.patient', 'patient')
      .addSelect(PATIENT_COLUMNS)
      .leftJoin('p.doctor', 'doctor')
      .addSelect(DOCTOR_COLUMNS)
      .andWhere('p.hospitalId = :hospitalId', { hospitalId: scope.hospitalId });
    if (scope.patientUserId) builder.andWhere('patient.userId = :patientUserId', { patientUserId: scope.patientUserId });
    if (scope.doctorUserId) builder.andWhere('doctor.userId = :doctorUserId', { doctorUserId: scope.doctorUserId });
    return builder;
  }
}
