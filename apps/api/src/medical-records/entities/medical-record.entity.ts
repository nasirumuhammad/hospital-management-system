import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { Appointment } from '../../appointments/entities/appointment.entity';
import { AbstractEntity } from '../../common/entities/abstract.entity';
import { Doctor } from '../../doctors/entities/doctor.entity';
import { Patient } from '../../patients/entities/patient.entity';

@Entity('medical_records')
@Index('IDX_medical_records_patient', ['patientId'])
@Index('IDX_medical_records_doctor', ['doctorId'])
export class MedicalRecord extends AbstractEntity {
  @Column({ type: 'uuid' })
  patientId: string;

  @ManyToOne(() => Patient, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'patientId', foreignKeyConstraintName: 'FK_medical_records_patient' })
  patient: Patient;

  @Column({ type: 'uuid' })
  doctorId: string;

  @ManyToOne(() => Doctor, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'doctorId', foreignKeyConstraintName: 'FK_medical_records_doctor' })
  doctor: Doctor;

  @Column({ type: 'uuid', nullable: true })
  appointmentId: string | null;

  @ManyToOne(() => Appointment, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'appointmentId', foreignKeyConstraintName: 'FK_medical_records_appointment' })
  appointment: Appointment | null;

  @Column({ type: 'varchar', length: 180 })
  diagnosis: string;

  @Column({ type: 'text' })
  notes: string;

  @Column({ type: 'text', nullable: true })
  allergies: string | null;

  @Column({ type: 'text', nullable: true })
  treatmentPlan: string | null;
}
