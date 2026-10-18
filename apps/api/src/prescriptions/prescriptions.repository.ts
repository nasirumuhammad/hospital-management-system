import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { PaginatedResult } from '../common/interfaces/paginated-result.interface';
import { paginate } from '../common/utils/pagination.util';
import { ListPrescriptionsQueryDto } from './dto/list-prescriptions-query.dto';
import { Prescription } from './entities/prescription.entity';

export interface PrescriptionScope {
  patientUserId?: string;
  doctorUserId?: string;
}

const PATIENT_COLUMNS = ['patient.id', 'patient.firstName', 'patient.lastName'];
const DOCTOR_COLUMNS = ['doctor.id', 'doctor.firstName', 'doctor.lastName', 'doctor.specialty'];

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
    const builder = this.scoped(scope).orderBy('p.createdAt', 'DESC');
    if (query.patientId) builder.andWhere('p.patientId = :patientId', { patientId: query.patientId });
    return paginate(builder, query);
  }

  private scoped(scope: PrescriptionScope): SelectQueryBuilder<Prescription> {
    const builder = this.repository
      .createQueryBuilder('p')
      .withDeleted()
      .leftJoin('p.patient', 'patient')
      .addSelect(PATIENT_COLUMNS)
      .leftJoin('p.doctor', 'doctor')
      .addSelect(DOCTOR_COLUMNS);
    if (scope.patientUserId) builder.andWhere('patient.userId = :patientUserId', { patientUserId: scope.patientUserId });
    if (scope.doctorUserId) builder.andWhere('doctor.userId = :doctorUserId', { doctorUserId: scope.doctorUserId });
    return builder;
  }
}
