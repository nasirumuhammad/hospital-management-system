import { Column, DeleteDateColumn, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { AbstractEntity } from '../../common/entities/abstract.entity';
import { AppointmentStatus } from '../../common/enums/appointment-status.enum';
import { Doctor } from '../../doctors/entities/doctor.entity';
import { Patient } from '../../patients/entities/patient.entity';

@Entity('appointments')
@Index('IDX_appointments_doctor_scheduled', ['doctorId', 'scheduledAt'])
@Index('IDX_appointments_patient', ['patientId'])
@Index('IDX_appointments_status', ['status'])
@Index('UQ_appointments_doctor_slot_open', ['doctorId', 'scheduledAt'], {
  unique: true,
  where: `"deletedAt" IS NULL AND "status" IN ('PENDING', 'CONFIRMED')`,
})
export class Appointment extends AbstractEntity {
  @Column({ type: 'uuid' })
  hospitalId: string;


  @Column({ type: 'uuid' })
  patientId: string;

  @ManyToOne(() => Patient, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'patientId', foreignKeyConstraintName: 'FK_appointments_patient' })
  patient: Patient;

  @Column({ type: 'uuid' })
  doctorId: string;

  @ManyToOne(() => Doctor, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'doctorId', foreignKeyConstraintName: 'FK_appointments_doctor' })
  doctor: Doctor;

  @Column({ type: 'timestamptz' })
  scheduledAt: Date;

  @Column({ type: 'varchar', length: 20, default: AppointmentStatus.PENDING })
  status: AppointmentStatus;

  @Column({ type: 'text', nullable: true })
  reason: string | null;

  @DeleteDateColumn({ type: 'timestamptz' })
  deletedAt: Date | null;
}
