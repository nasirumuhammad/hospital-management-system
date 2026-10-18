import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { UserTokenType } from '../../common/enums/user-token-type.enum';
import { User } from './user.entity';

@Entity('user_tokens')
@Index('UQ_user_tokens_hash', ['tokenHash'], { unique: true })
@Index('IDX_user_tokens_user_type', ['userId', 'type'])
export class UserToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId', foreignKeyConstraintName: 'FK_user_tokens_user' })
  user: User;

  @Column({ type: 'varchar', length: 30 })
  type: UserTokenType;

  @Column({ type: 'varchar', length: 64 })
  tokenHash: string;

  @Column({ type: 'timestamptz' })
  expiresAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  usedAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
