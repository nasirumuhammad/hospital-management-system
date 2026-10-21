import { Column, Entity, Unique } from 'typeorm';
import { AbstractEntity } from '../../common/entities/abstract.entity';
import { UserRole } from '../../common/enums/user-role.enum';

@Entity('staff_users')
@Unique('UQ_staff_users_email', ['email'])
export class User extends AbstractEntity {
  @Column({ type: 'uuid', nullable: true })
  hospitalId: string | null;

  @Column({ type: 'varchar', length: 180 })
  email: string;

  @Column({ type: 'varchar', length: 100, select: false })
  passwordHash: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 20, default: UserRole.PATIENT })
  role: UserRole;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'int', default: 0 })
  tokenVersion: number;

  @Column({ type: 'timestamptz', nullable: true })
  emailVerifiedAt: Date | null;
}
