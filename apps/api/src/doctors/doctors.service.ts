import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../common/enums/audit-action.enum';
import { AuditTarget } from '../common/enums/audit-target.enum';
import { UserRole } from '../common/enums/user-role.enum';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { PaginatedResult } from '../common/interfaces/paginated-result.interface';
import { assertNoNulls } from '../common/utils/assert-no-nulls.util';
import { DoctorsRepository } from './doctors.repository';
import { CreateDoctorDto } from './dto/create-doctor.dto';
import { ListDoctorsQueryDto } from './dto/list-doctors-query.dto';
import { UpdateDoctorDto } from './dto/update-doctor.dto';
import { Doctor } from './entities/doctor.entity';

const REQUIRED_FIELDS: (keyof UpdateDoctorDto)[] = ['firstName', 'lastName', 'email', 'specialty', 'isActive'];

@Injectable()
export class DoctorsService {
  constructor(
    private readonly repository: DoctorsRepository,
    private readonly audit: AuditService,
  ) {}

  list(query: ListDoctorsQueryDto, viewer: AuthenticatedUser): Promise<PaginatedResult<Doctor>> {
    const includeInactive = viewer.role === UserRole.ADMIN && query.includeInactive === true;
    return this.repository.search(query, includeInactive, this.requireHospital(viewer));
  }

  countActive(viewer: AuthenticatedUser): Promise<number> {
    return this.repository.countActive(this.requireHospital(viewer));
  }

  async findOrFail(id: string, actor: AuthenticatedUser): Promise<Doctor> {
    const doctor = await this.repository.findById(id, this.requireHospital(actor));
    if (!doctor) throw new NotFoundException('Doctor not found');
    return doctor;
  }

  async findActiveOrFail(id: string, actor: AuthenticatedUser): Promise<Doctor> {
    const doctor = await this.repository.findActiveById(id, this.requireHospital(actor));
    if (!doctor) throw new NotFoundException('Choose an active doctor');
    return doctor;
  }

  async findByUserIdOrFail(userId: string, actor: AuthenticatedUser): Promise<Doctor> {
    const doctor = await this.repository.findByUserId(userId, this.requireHospital(actor));
    if (!doctor) throw new ForbiddenException('Your account is not linked to a doctor profile');
    return doctor;
  }

  async create(dto: CreateDoctorDto, actor: AuthenticatedUser): Promise<Doctor> {
    const hospitalId = this.requireHospital(actor);
    const saved = await this.repository.save(this.repository.create({ ...dto, hospitalId }));
    await this.record(AuditAction.DOCTOR_CREATED, actor, saved.id);
    return saved;
  }

  async update(id: string, dto: UpdateDoctorDto, actor: AuthenticatedUser): Promise<Doctor> {
    assertNoNulls(dto, REQUIRED_FIELDS);
    const doctor = await this.findOrFail(id, actor);
    const saved = await this.repository.save(Object.assign(doctor, dto));
    await this.record(AuditAction.DOCTOR_UPDATED, actor, id);
    return saved;
  }

  async remove(id: string, actor: AuthenticatedUser): Promise<void> {
    await this.findOrFail(id, actor);
    await this.repository.softDelete(id, this.requireHospital(actor));
    await this.record(AuditAction.DOCTOR_DELETED, actor, id);
  }

  async linkUser(doctorId: string, userId: string, actor: AuthenticatedUser): Promise<Doctor> {
    const doctor = await this.findOrFail(doctorId, actor);
    if (doctor.userId && doctor.userId !== userId) throw new ConflictException('Doctor profile is already linked');
    if (await this.repository.existsByUserId(userId, this.requireHospital(actor))) throw new ConflictException('This account already has a doctor profile');
    doctor.userId = userId;
    const saved = await this.repository.save(doctor);
    await this.record(AuditAction.PROFILE_LINKED, actor, doctorId, { userId });
    return saved;
  }

  private requireHospital(actor: AuthenticatedUser): string {
    if (!actor.hospitalId) throw new NotFoundException('A hospital must be selected for this operation');
    return actor.hospitalId;
  }

  private record(action: AuditAction, actor: AuthenticatedUser, targetId: string, metadata?: Record<string, unknown>) {
    return this.audit.record({ hospitalId: this.requireHospital(actor), actorId: actor.id, action, targetType: AuditTarget.DOCTOR, targetId, metadata });
  }
}
