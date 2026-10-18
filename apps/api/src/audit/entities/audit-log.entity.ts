import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('audit_logs')
@Index('IDX_audit_logs_created', ['createdAt'])
@Index('IDX_audit_logs_actor', ['actorId'])
@Index('IDX_audit_logs_target', ['targetType', 'targetId'])
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true })
  actorId: string | null;

  @Column({ type: 'varchar', length: 100 })
  action: string;

  @Column({ type: 'varchar', length: 80 })
  targetType: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  targetId: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
