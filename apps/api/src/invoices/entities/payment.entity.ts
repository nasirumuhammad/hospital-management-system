import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { PaymentMethod } from '../../common/enums/payment-method.enum';
import { User } from '../../users/entities/user.entity';
import { Invoice } from './invoice.entity';

@Entity('payments')
@Index('IDX_payments_invoice', ['invoiceId'])
export class Payment {
  @Column({ type: 'uuid' })
  hospitalId: string;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  invoiceId: string;

  @ManyToOne(() => Invoice, (invoice) => invoice.payments, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'invoiceId', foreignKeyConstraintName: 'FK_payments_invoice' })
  invoice: Invoice;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  amount: string;

  @Column({ type: 'varchar', length: 20 })
  method: PaymentMethod;

  @Column({ type: 'varchar', length: 100, nullable: true })
  reference: string | null;

  @Column({ type: 'uuid', nullable: true })
  receivedById: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'receivedById', foreignKeyConstraintName: 'FK_payments_received_by' })
  receivedBy: User | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
