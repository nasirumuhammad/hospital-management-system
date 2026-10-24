import { Column, DeleteDateColumn, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { AbstractEntity } from '../../common/entities/abstract.entity';
import { UserRole } from '../../common/enums/user-role.enum';
import { User } from '../../users/entities/user.entity';

/** The person behind a nurse, cashier, lab, pharmacy, ward or front-desk login. Lives independently of the sign-in account. */
@Entity('staff_members')
@Index('UQ_staff_members_hospital_email', ['hospitalId', 'email'], { unique: true, where: '"deletedAt" IS NULL' })
@Index('UQ_staff_members_userId_active', ['userId'], { unique: true, where: '"deletedAt" IS NULL' })
export class StaffMember extends AbstractEntity {
  @Column({ type: 'uuid' })
  hospitalId: string;

  @Column({ type: 'varchar', length: 100 })
  firstName: string;

  @Column({ type: 'varchar', length: 100 })
  lastName: string;

  @Column({ type: 'varchar', length: 180 })
  email: string;

  @Column({ type: 'varchar', length: 30, nullable: true })
  phone: string | null;

  /** Must equal the linked account's role. */
  @Column({ type: 'varchar', length: 20 })
  role: UserRole;

  @Column({ type: 'varchar', length: 120, nullable: true })
  jobTitle: string | null;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'uuid', nullable: true })
  userId: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'userId', foreignKeyConstraintName: 'FK_staff_members_user' })
  user: User | null;

  @DeleteDateColumn({ type: 'timestamptz' })
  deletedAt: Date | null;
}
