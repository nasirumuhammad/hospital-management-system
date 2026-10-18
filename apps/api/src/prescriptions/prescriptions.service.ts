import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
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
    const doctor = await this.doctors.findByUserIdOrFail(user.id);
    const patient = await this.patients.findOrFail(dto.patientId);
    if (dto.medicalRecordId) await this.assertRecordMatches(dto.medicalRecordId, patient.id, doctor.id);
    const saved = await this.repository.save(
      this.repository.create({
        patientId: patient.id,
        doctorId: doctor.id,
        medicalRecordId: dto.medicalRecordId ?? null,
        medication: dto.medication,
        dosage: dto.dosage,
        frequency: dto.frequency,
        duration: dto.duration,
        instructions: dto.instructions ?? null,
      }),
    );
    await this.audit.record({ actorId: user.id, action: AuditAction.PRESCRIPTION_CREATED, targetType: AuditTarget.PRESCRIPTION, targetId: saved.id });
    return this.findOne(saved.id, user);
  }

  private async assertRecordMatches(recordId: string, patientId: string, doctorId: string): Promise<void> {
    const record = await this.records.findAuthoredBy(recordId, doctorId);
    if (!record || record.patientId !== patientId) {
      throw new BadRequestException('Medical record must belong to this patient and doctor');
    }
  }

  private scopeFor(user: AuthenticatedUser): PrescriptionScope {
    if (user.role === UserRole.PATIENT) return { patientUserId: user.id };
    if (user.role === UserRole.DOCTOR) return { doctorUserId: user.id };
    return {};
  }
}
