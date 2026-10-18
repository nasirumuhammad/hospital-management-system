import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('refresh_tokens')
@Index('UQ_refresh_tokens_hash', ['tokenHash'], { unique: true })
@Index('IDX_refresh_tokens_user', ['userId'])
@Index('IDX_refresh_tokens_family', ['familyId'])
export class RefreshToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId', foreignKeyConstraintName: 'FK_refresh_tokens_user' })
  user: User;

  @Column({ type: 'uuid' })
  familyId: string;

  @Column({ type: 'varchar', length: 64 })
  tokenHash: string;

  @Column({ type: 'int' })
  tokenVersion: number;

  @Column({ type: 'timestamptz' })
  expiresAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  revokedAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
