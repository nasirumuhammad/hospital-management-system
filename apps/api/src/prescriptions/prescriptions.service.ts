import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../common/enums/audit-action.enum';
import { AuditTarget } from '../common/enums/audit-target.enum';
import { UserRole } from '../common/enums/user-role.enum';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { PaginatedResult } from '../common/interfaces/paginated-result.interface';
import { DoctorsService } from '../doctors/doctors.service';
import { MedicalRecordsService } from '../medical-records/medical-records.service';
import { PatientsService } from '../patients/patients.service';
import { CreatePrescriptionDto } from './dto/create-prescription.dto';
import { ListPrescriptionsQueryDto } from './dto/list-prescriptions-query.dto';
import { Prescription } from './entities/prescription.entity';
import { PrescriptionScope, PrescriptionsRepository } from './prescriptions.repository';

@Injectable()
export class PrescriptionsService {
  constructor(
    private readonly repository: PrescriptionsRepository,
    private readonly records: MedicalRecordsService,
    private readonly patients: PatientsService,
    private readonly doctors: DoctorsService,
    private readonly audit: AuditService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  list(query: ListPrescriptionsQueryDto, user: AuthenticatedUser): Promise<PaginatedResult<Prescription>> {
    return this.repository.search(query, this.scopeFor(user));
  }

  async findOne(id: string, user: AuthenticatedUser): Promise<Prescription> {
    const prescription = await this.repository.findOneScoped(id, this.scopeFor(user));
    if (!prescription) throw new NotFoundException('Prescription not found');
    return prescription;
  }

  async create(dto: CreatePrescriptionDto, user: AuthenticatedUser): Promise<Prescription> {
    const doctor = await this.doctors.findByUserIdOrFail(user.id, user);
    const patient = await this.patients.findOrFail(dto.patientId, user);
    await this.assertRecordMatches(dto.medicalRecordId, patient.id, doctor.id, user);
    if (dto.drugId) {
      const drug = await this.dataSource.query(`SELECT \"id\" FROM \"drugs\" WHERE \"id\"=$1 AND \"hospitalId\"=$2 AND \"isActive\"=true`, [dto.drugId, this.requireHospital(user)]);
      if (!drug.length) throw new BadRequestException('Choose an active drug from this hospital catalogue');
      if (!dto.quantityPrescribed) throw new BadRequestException('quantityPrescribed is required when a catalog drug is selected');
    }
    const saved = await this.repository.save(
      this.repository.create({
        hospitalId: this.requireHospital(user),
        patientId: patient.id,
        doctorId: doctor.id,
        medicalRecordId: dto.medicalRecordId ?? null,
        medication: dto.medication,
        dosage: dto.dosage,
        frequency: dto.frequency,
        duration: dto.duration,
        instructions: dto.instructions ?? null,
        drugId: dto.drugId ?? null,
        quantityPrescribed: dto.quantityPrescribed ?? null,
        status: 'PENDING',
      }),
    );
    await this.audit.record({ hospitalId: this.requireHospital(user), actorId: user.id, action: AuditAction.PRESCRIPTION_CREATED, targetType: AuditTarget.PRESCRIPTION, targetId: saved.id });
    return this.findOne(saved.id, user);
  }

  private async assertRecordMatches(recordId: string, patientId: string, doctorId: string, user: AuthenticatedUser): Promise<void> {
    const record = await this.records.findAuthoredBy(recordId, doctorId, user);
    if (!record || record.patientId !== patientId) {
      throw new BadRequestException('Medical record must belong to this patient and doctor');
    }
  }

  private scopeFor(user: AuthenticatedUser): PrescriptionScope {
    const hospitalId = this.requireHospital(user);
    if (user.role === UserRole.PATIENT) return { hospitalId, patientUserId: user.id };
    if (user.role === UserRole.DOCTOR) return { hospitalId, doctorUserId: user.id };
    return { hospitalId };
  }

  private requireHospital(user: AuthenticatedUser): string {
    if (!user.hospitalId) throw new NotFoundException('A hospital must be selected for this operation');
    return user.hospitalId;
  }
}
