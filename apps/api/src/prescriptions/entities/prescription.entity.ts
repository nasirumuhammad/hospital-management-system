import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Doctor } from '../../doctors/entities/doctor.entity';
import { MedicalRecord } from '../../medical-records/entities/medical-record.entity';
import { Patient } from '../../patients/entities/patient.entity';

@Entity('prescriptions')
@Index('IDX_prescriptions_patient', ['patientId'])
@Index('IDX_prescriptions_doctor', ['doctorId'])
export class Prescription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  patientId: string;

  @ManyToOne(() => Patient, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'patientId', foreignKeyConstraintName: 'FK_prescriptions_patient' })
  patient: Patient;

  @Column({ type: 'uuid' })
  doctorId: string;

  @ManyToOne(() => Doctor, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'doctorId', foreignKeyConstraintName: 'FK_prescriptions_doctor' })
  doctor: Doctor;

  @Column({ type: 'uuid', nullable: true })
  medicalRecordId: string | null;

  @ManyToOne(() => MedicalRecord, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'medicalRecordId', foreignKeyConstraintName: 'FK_prescriptions_record' })
  medicalRecord: MedicalRecord | null;

  @Column({ type: 'varchar', length: 180 })
  medication: string;

  @Column({ type: 'varchar', length: 100 })
  dosage: string;

  @Column({ type: 'varchar', length: 100 })
  frequency: string;

  @Column({ type: 'varchar', length: 100 })
  duration: string;

  @Column({ type: 'text', nullable: true })
  instructions: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
