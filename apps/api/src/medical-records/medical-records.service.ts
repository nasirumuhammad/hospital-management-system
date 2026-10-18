import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { AppointmentsRepository } from '../appointments/appointments.repository';
import { AuditAction } from '../common/enums/audit-action.enum';
import { AuditTarget } from '../common/enums/audit-target.enum';
import { UserRole } from '../common/enums/user-role.enum';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { PaginatedResult } from '../common/interfaces/paginated-result.interface';
import { assertNoNulls } from '../common/utils/assert-no-nulls.util';
import { DoctorsService } from '../doctors/doctors.service';
import { PatientsService } from '../patients/patients.service';
import { CreateMedicalRecordDto } from './dto/create-medical-record.dto';
import { ListMedicalRecordsQueryDto } from './dto/list-medical-records-query.dto';
import { UpdateMedicalRecordDto } from './dto/update-medical-record.dto';
import { MedicalRecord } from './entities/medical-record.entity';
import { MedicalRecordsRepository, RecordScope } from './medical-records.repository';

const REQUIRED_FIELDS: (keyof UpdateMedicalRecordDto)[] = ['diagnosis', 'notes'];

@Injectable()
export class MedicalRecordsService {
  constructor(
    private readonly repository: MedicalRecordsRepository,
    private readonly appointments: AppointmentsRepository,
    private readonly patients: PatientsService,
    private readonly doctors: DoctorsService,
    private readonly audit: AuditService,
  ) {}

  list(query: ListMedicalRecordsQueryDto, user: AuthenticatedUser): Promise<PaginatedResult<MedicalRecord>> {
    return this.repository.search(query, this.scopeFor(user));
  }

  async findOne(id: string, user: AuthenticatedUser): Promise<MedicalRecord> {
    const record = await this.findScopedOrFail(id, this.scopeFor(user));
    await this.record(AuditAction.MEDICAL_RECORD_VIEWED, user, id);
    return record;
  }

  async create(dto: CreateMedicalRecordDto, user: AuthenticatedUser): Promise<MedicalRecord> {
    const doctor = await this.doctors.findByUserIdOrFail(user.id);
    const patient = await this.patients.findOrFail(dto.patientId);
    if (dto.appointmentId) await this.assertAppointmentMatches(dto.appointmentId, patient.id, doctor.id);
    const saved = await this.repository.save(
      this.repository.create({
        patientId: patient.id,
        doctorId: doctor.id,
        appointmentId: dto.appointmentId ?? null,
        diagnosis: dto.diagnosis,
        notes: dto.notes,
        allergies: dto.allergies ?? null,
        treatmentPlan: dto.treatmentPlan ?? null,
      }),
    );
    await this.record(AuditAction.MEDICAL_RECORD_CREATED, user, saved.id);
    return this.findScopedOrFail(saved.id, {});
  }

  async update(id: string, dto: UpdateMedicalRecordDto, user: AuthenticatedUser): Promise<MedicalRecord> {
    assertNoNulls(dto, REQUIRED_FIELDS);
    await this.findScopedOrFail(id, this.scopeFor(user));
    await this.repository.update(id, dto);
    await this.record(AuditAction.MEDICAL_RECORD_UPDATED, user, id);
    return this.findScopedOrFail(id, {});
  }

  async findAuthoredBy(recordId: string, doctorId: string): Promise<MedicalRecord | null> {
    const record = await this.repository.findPlainById(recordId);
    return record && record.doctorId === doctorId ? record : null;
  }

  private async findScopedOrFail(id: string, scope: RecordScope): Promise<MedicalRecord> {
    const record = await this.repository.findOneScoped(id, scope);
    if (!record) throw new NotFoundException('Medical record not found');
    return record;
  }

  private async assertAppointmentMatches(appointmentId: string, patientId: string, doctorId: string): Promise<void> {
    const appointment = await this.appointments.findOneScoped(appointmentId, {});
    if (!appointment || appointment.patientId !== patientId || appointment.doctorId !== doctorId) {
      throw new BadRequestException('Appointment must belong to this patient and doctor');
    }
  }

  private scopeFor(user: AuthenticatedUser): RecordScope {
    if (user.role === UserRole.PATIENT) return { patientUserId: user.id };
    if (user.role === UserRole.DOCTOR) return { doctorUserId: user.id };
    return {};
  }

  private record(action: AuditAction, user: AuthenticatedUser, targetId: string) {
    return this.audit.record({ actorId: user.id, action, targetType: AuditTarget.MEDICAL_RECORD, targetId });
  }
}
