import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { Appointment } from '../../appointments/entities/appointment.entity';
import { AbstractEntity } from '../../common/entities/abstract.entity';
import { InvoiceStatus } from '../../common/enums/invoice-status.enum';
import { Patient } from '../../patients/entities/patient.entity';
import { Payment } from './payment.entity';

@Entity('invoices')
@Index('IDX_invoices_patient', ['patientId'])
@Index('IDX_invoices_status', ['status'])
export class Invoice extends AbstractEntity {
  @Column({ type: 'uuid' })
  hospitalId: string;


  @Column({ type: 'uuid' })
  patientId: string;

  @ManyToOne(() => Patient, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'patientId', foreignKeyConstraintName: 'FK_invoices_patient' })
  patient: Patient;

  @Column({ type: 'uuid', nullable: true })
  appointmentId: string | null;

  @Column({ type: 'uuid', nullable: true })
  visitId: string | null;

  @ManyToOne(() => Appointment, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'appointmentId', foreignKeyConstraintName: 'FK_invoices_appointment' })
  appointment: Appointment | null;

  @Column({ type: 'varchar', length: 180 })
  description: string;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  amount: string;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  amountPaid: string;

  @Column({ type: 'varchar', length: 20, default: InvoiceStatus.UNPAID })
  status: InvoiceStatus;

  @Column({ type: 'date', nullable: true })
  dueDate: string | null;

  @OneToMany(() => Payment, (payment) => payment.invoice)
  payments: Payment[];
}
