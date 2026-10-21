import { Column, DeleteDateColumn, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { AbstractEntity } from '../../common/entities/abstract.entity';
import { User } from '../../users/entities/user.entity';

@Entity('patients')
@Index('UQ_patients_email_active', ['hospitalId', 'email'], { unique: true, where: '"email" IS NOT NULL AND "deletedAt" IS NULL' })
@Index('UQ_patients_userId_active', ['userId'], { unique: true, where: '"deletedAt" IS NULL' })
@Index('UQ_patients_hospital_number', ['hospitalId', 'hospitalNumber'], { unique: true })
export class Patient extends AbstractEntity {
  @Column({ type: 'uuid' })
  hospitalId: string;


  @Column({ type: 'varchar', length: 100 })
  firstName: string;

  @Column({ type: 'varchar', length: 100 })
  lastName: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  middleName: string | null;

  @Column({ type: 'varchar', length: 30 })
  hospitalNumber: string;

  @Column({ type: 'varchar', length: 180, nullable: true })
  email: string | null;

  @Column({ type: 'varchar', length: 30 })
  phone: string;

  @Column({ type: 'date', nullable: true })
  dateOfBirth: string | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  gender: string | null;

  @Column({ type: 'text', nullable: true })
  address: string | null;

  @Column({ type: 'varchar', length: 150, nullable: true })
  nextOfKinName: string | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  nextOfKinPhone: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  nextOfKinRelationship: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  allergiesReviewedAt: Date | null;

  @Column({ type: 'uuid', nullable: true })
  userId: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'userId', foreignKeyConstraintName: 'FK_patients_user' })
  user: User | null;

  @DeleteDateColumn({ type: 'timestamptz' })
  deletedAt: Date | null;
}
