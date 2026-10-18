import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { AppointmentStatus } from '../common/enums/appointment-status.enum';
import { PaginatedResult } from '../common/interfaces/paginated-result.interface';
import { toContainsPattern } from '../common/utils/escape-like.util';
import { paginate } from '../common/utils/pagination.util';
import { OPEN_STATUSES } from './appointment-rules';
import { ListAppointmentsQueryDto } from './dto/list-appointments-query.dto';
import { Appointment } from './entities/appointment.entity';

export interface AppointmentScope {
  patientUserId?: string;
  doctorUserId?: string;
}

const PATIENT_COLUMNS = ['patient.id', 'patient.firstName', 'patient.lastName', 'patient.email', 'patient.phone'];
const DOCTOR_COLUMNS = ['doctor.id', 'doctor.firstName', 'doctor.lastName', 'doctor.specialty'];

@Injectable()
export class AppointmentsRepository {
  constructor(@InjectRepository(Appointment) private readonly repository: Repository<Appointment>) {}

  create(data: Partial<Appointment>): Appointment {
    return this.repository.create(data);
  }

  save(appointment: Appointment): Promise<Appointment> {
    return this.repository.save(appointment);
  }

  async update(id: string, changes: Partial<Pick<Appointment, 'status' | 'scheduledAt' | 'reason'>>): Promise<void> {
    await this.repository.update({ id }, changes);
  }

  async softDelete(id: string): Promise<void> {
    await this.repository.softDelete({ id });
  }

  findOneScoped(id: string, scope: AppointmentScope): Promise<Appointment | null> {
    return this.scoped(scope).andWhere('a.id = :id', { id }).getOne();
  }

  search(query: ListAppointmentsQueryDto, scope: AppointmentScope): Promise<PaginatedResult<Appointment>> {
    const builder = this.scoped(scope).orderBy('a.scheduledAt', query.order === 'desc' ? 'DESC' : 'ASC');
    if (query.status) builder.andWhere('a.status = :status', { status: query.status });
    if (query.doctorId) builder.andWhere('a.doctorId = :doctorId', { doctorId: query.doctorId });
    if (query.patientId) builder.andWhere('a.patientId = :patientId', { patientId: query.patientId });
    if (query.from) builder.andWhere('a.scheduledAt >= :from', { from: query.from });
    if (query.to) builder.andWhere('a.scheduledAt <= :to', { to: query.to });
    if (query.q) this.applyTextSearch(builder, query.q);
    return paginate(builder, query);
  }

  async existsOverlapping(doctorId: string, window: { from: Date; to: Date }, excludeId?: string): Promise<boolean> {
    const builder = this.repository
      .createQueryBuilder('a')
      .where('a.doctorId = :doctorId', { doctorId })
      .andWhere('a.status IN (:...open)', { open: OPEN_STATUSES })
      .andWhere('a.scheduledAt > :from AND a.scheduledAt < :to', window);
    if (excludeId) builder.andWhere('a.id <> :excludeId', { excludeId });
    return (await builder.getCount()) > 0;
  }

  count(scope: AppointmentScope, filter: { status?: AppointmentStatus; upcomingFrom?: Date } = {}): Promise<number> {
    const builder = this.scoped(scope);
    if (filter.status) builder.andWhere('a.status = :status', { status: filter.status });
    if (filter.upcomingFrom) {
      builder.andWhere('a.status IN (:...open)', { open: OPEN_STATUSES }).andWhere('a.scheduledAt >= :now', { now: filter.upcomingFrom });
    }
    return builder.getCount();
  }

  private scoped(scope: AppointmentScope): SelectQueryBuilder<Appointment> {
    const builder = this.repository
      .createQueryBuilder('a')
      .withDeleted()
      .leftJoin('a.patient', 'patient')
      .addSelect(PATIENT_COLUMNS)
      .leftJoin('a.doctor', 'doctor')
      .addSelect(DOCTOR_COLUMNS)
      .where('a.deletedAt IS NULL');
    if (scope.patientUserId) builder.andWhere('patient.userId = :patientUserId', { patientUserId: scope.patientUserId });
    if (scope.doctorUserId) builder.andWhere('doctor.userId = :doctorUserId', { doctorUserId: scope.doctorUserId });
    return builder;
  }

  private applyTextSearch(builder: SelectQueryBuilder<Appointment>, term: string): void {
    builder.andWhere(
      `(patient."firstName" || ' ' || patient."lastName" ILIKE :pattern OR doctor."firstName" || ' ' || doctor."lastName" ILIKE :pattern)`,
      { pattern: toContainsPattern(term) },
    );
  }
}
