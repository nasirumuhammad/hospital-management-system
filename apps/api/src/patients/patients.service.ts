import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../common/enums/audit-action.enum';
import { AuditTarget } from '../common/enums/audit-target.enum';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { PaginatedResult } from '../common/interfaces/paginated-result.interface';
import { assertNoNulls } from '../common/utils/assert-no-nulls.util';
import { CreatePatientDto } from './dto/create-patient.dto';
import { ListPatientsQueryDto } from './dto/list-patients-query.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { Patient } from './entities/patient.entity';
import { PatientsRepository } from './patients.repository';

const REQUIRED_FIELDS: (keyof UpdatePatientDto)[] = ['firstName', 'lastName', 'phone'];

@Injectable()
export class PatientsService {
  constructor(
    private readonly repository: PatientsRepository,
    private readonly audit: AuditService,
  ) {}

  list(query: ListPatientsQueryDto, actor: AuthenticatedUser): Promise<PaginatedResult<Patient>> {
    return this.repository.search(query, this.requireHospital(actor));
  }

  count(actor: AuthenticatedUser): Promise<number> {
    return this.repository.count(this.requireHospital(actor));
  }

  async findOrFail(id: string, actor: AuthenticatedUser): Promise<Patient> {
    const patient = await this.repository.findById(id, this.requireHospital(actor));
    if (!patient) throw new NotFoundException('Patient not found');
    return patient;
  }

  async findByUserIdOrFail(userId: string, actor: AuthenticatedUser): Promise<Patient> {
    const patient = await this.repository.findByUserId(userId, this.requireHospital(actor));
    if (!patient) throw new NotFoundException('No patient profile is linked to this account');
    return patient;
  }

  async create(dto: CreatePatientDto, actor: AuthenticatedUser): Promise<Patient> {
    const hospitalId = this.requireHospital(actor);
    const saved = await this.repository.save(this.repository.create({ ...dto, hospitalId }));
    await this.record(AuditAction.PATIENT_CREATED, actor, saved.id);
    return saved;
  }

  async update(id: string, dto: UpdatePatientDto, actor: AuthenticatedUser): Promise<Patient> {
    assertNoNulls(dto, REQUIRED_FIELDS);
    const patient = await this.findOrFail(id, actor);
    const saved = await this.repository.save(Object.assign(patient, dto));
    await this.record(AuditAction.PATIENT_UPDATED, actor, id);
    return saved;
  }

  async remove(id: string, actor: AuthenticatedUser): Promise<void> {
    await this.findOrFail(id, actor);
    await this.repository.softDelete(id, this.requireHospital(actor));
    await this.record(AuditAction.PATIENT_DELETED, actor, id);
  }

  async linkUser(patientId: string, userId: string, actor: AuthenticatedUser): Promise<Patient> {
    const patient = await this.findOrFail(patientId, actor);
    if (patient.userId && patient.userId !== userId) throw new ConflictException('Patient profile is already linked');
    if (await this.repository.existsByUserId(userId, this.requireHospital(actor))) throw new ConflictException('This account already has a patient profile');
    patient.userId = userId;
    const saved = await this.repository.save(patient);
    await this.record(AuditAction.PROFILE_LINKED, actor, patientId, { userId });
    return saved;
  }

  private requireHospital(actor: AuthenticatedUser): string {
    if (!actor.hospitalId) throw new NotFoundException('A hospital must be selected for this operation');
    return actor.hospitalId;
  }

  private record(action: AuditAction, actor: AuthenticatedUser, targetId: string, metadata?: Record<string, unknown>) {
    return this.audit.record({ hospitalId: this.requireHospital(actor), actorId: actor.id, action, targetType: AuditTarget.PATIENT, targetId, metadata });
  }
}
