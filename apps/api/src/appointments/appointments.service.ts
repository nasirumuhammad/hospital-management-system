import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { AppointmentStatus } from '../common/enums/appointment-status.enum';
import { AuditAction } from '../common/enums/audit-action.enum';
import { AuditTarget } from '../common/enums/audit-target.enum';
import { UserRole } from '../common/enums/user-role.enum';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { PaginatedResult } from '../common/interfaces/paginated-result.interface';
import { DoctorsService } from '../doctors/doctors.service';
import { PatientsService } from '../patients/patients.service';
import { canTransition, conflictWindow, isOpen } from './appointment-rules';
import { AppointmentScope, AppointmentsRepository } from './appointments.repository';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { ListAppointmentsQueryDto } from './dto/list-appointments-query.dto';
import { RescheduleAppointmentDto } from './dto/reschedule-appointment.dto';
import { Appointment } from './entities/appointment.entity';

@Injectable()
export class AppointmentsService {
  constructor(
    private readonly repository: AppointmentsRepository,
    private readonly patients: PatientsService,
    private readonly doctors: DoctorsService,
    private readonly audit: AuditService,
  ) {}

  list(query: ListAppointmentsQueryDto, user: AuthenticatedUser): Promise<PaginatedResult<Appointment>> {
    return this.repository.search(query, this.scopeFor(user));
  }

  findOne(id: string, user: AuthenticatedUser): Promise<Appointment> {
    return this.findScopedOrFail(id, this.scopeFor(user));
  }

  count(user: AuthenticatedUser, filter?: { status?: AppointmentStatus; upcomingFrom?: Date }): Promise<number> {
    return this.repository.count(this.scopeFor(user), filter);
  }

  async create(dto: CreateAppointmentDto, user: AuthenticatedUser): Promise<Appointment> {
    const patient = await this.resolvePatient(dto, user);
    const doctor = await this.doctors.findActiveOrFail(dto.doctorId, user);
    const scheduledAt = this.parseFutureDate(dto.scheduledAt);
    await this.assertSlotFree(doctor.id, scheduledAt, user);
    const saved = await this.repository.save(
      this.repository.create({ hospitalId: this.requireHospital(user), patientId: patient.id, doctorId: doctor.id, scheduledAt, reason: dto.reason ?? null, status: AppointmentStatus.PENDING }),
    );
    await this.record(AuditAction.APPOINTMENT_CREATED, user, saved.id, { patientId: patient.id, doctorId: doctor.id });
    return this.findScopedOrFail(saved.id, { hospitalId: this.requireHospital(user) });
  }

  async updateStatus(id: string, status: AppointmentStatus, user: AuthenticatedUser): Promise<Appointment> {
    const appointment = await this.findScopedOrFail(id, this.scopeFor(user));
    return this.transition(appointment, status, user);
  }

  async cancel(id: string, user: AuthenticatedUser): Promise<Appointment> {
    const appointment = await this.findScopedOrFail(id, this.scopeFor(user));
    return this.transition(appointment, AppointmentStatus.CANCELLED, user);
  }

  async reschedule(id: string, dto: RescheduleAppointmentDto, user: AuthenticatedUser): Promise<Appointment> {
    const appointment = await this.findScopedOrFail(id, this.scopeFor(user));
    if (!isOpen(appointment.status)) throw new BadRequestException('Only pending or confirmed appointments can be rescheduled');
    const scheduledAt = this.parseFutureDate(dto.scheduledAt);
    await this.assertSlotFree(appointment.doctorId, scheduledAt, user, appointment.id);
    await this.repository.update(id, this.requireHospital(user), { scheduledAt, reason: dto.reason ?? appointment.reason });
    await this.record(AuditAction.APPOINTMENT_RESCHEDULED, user, id, { scheduledAt: scheduledAt.toISOString() });
    return this.findScopedOrFail(id, this.scopeFor(user));
  }

  async remove(id: string, user: AuthenticatedUser): Promise<void> {
    await this.findScopedOrFail(id, this.scopeFor(user));
    await this.repository.softDelete(id, this.requireHospital(user));
    await this.record(AuditAction.APPOINTMENT_DELETED, user, id);
  }

  private async transition(appointment: Appointment, next: AppointmentStatus, user: AuthenticatedUser): Promise<Appointment> {
    if (!canTransition(appointment.status, next)) {
      throw new BadRequestException(`An appointment that is ${appointment.status.toLowerCase()} cannot become ${next.toLowerCase()}`);
    }
    const previous = appointment.status;
    await this.repository.update(appointment.id, this.requireHospital(user), { status: next });
    await this.record(AuditAction.APPOINTMENT_STATUS_CHANGED, user, appointment.id, { from: previous, to: next });
    return this.findScopedOrFail(appointment.id, this.scopeFor(user));
  }

  private async findScopedOrFail(id: string, scope: AppointmentScope): Promise<Appointment> {
    const appointment = await this.repository.findOneScoped(id, scope);
    if (!appointment) throw new NotFoundException('Appointment not found');
    return appointment;
  }

  private async resolvePatient(dto: CreateAppointmentDto, user: AuthenticatedUser) {
    if (user.role === UserRole.PATIENT) return this.patients.findByUserIdOrFail(user.id, user);
    if (!dto.patientId) throw new BadRequestException('patientId is required');
    return this.patients.findOrFail(dto.patientId, user);
  }

  private parseFutureDate(value: string): Date {
    const date = new Date(value);
    if (Number.isNaN(date.getTime()) || date.getTime() <= Date.now()) {
      throw new BadRequestException('Appointment must be scheduled for a future date and time');
    }
    return date;
  }

  private async assertSlotFree(doctorId: string, scheduledAt: Date, user: AuthenticatedUser, excludeId?: string): Promise<void> {
    if (await this.repository.existsOverlapping(doctorId, this.requireHospital(user), conflictWindow(scheduledAt), excludeId)) {
      throw new ConflictException('The doctor already has an appointment around that time');
    }
  }

  private scopeFor(user: AuthenticatedUser): AppointmentScope {
    const hospitalId = this.requireHospital(user);
    if (user.role === UserRole.PATIENT) return { hospitalId, patientUserId: user.id };
    if (user.role === UserRole.DOCTOR) return { hospitalId, doctorUserId: user.id };
    return { hospitalId };
  }

  private requireHospital(user: AuthenticatedUser): string {
    if (!user.hospitalId) throw new NotFoundException('A hospital must be selected for this operation');
    return user.hospitalId;
  }

  private record(action: AuditAction, user: AuthenticatedUser, targetId: string, metadata?: Record<string, unknown>) {
    return this.audit.record({ hospitalId: this.requireHospital(user), actorId: user.id, action, targetType: AuditTarget.APPOINTMENT, targetId, metadata });
  }
}
