import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { AuditAction } from '../common/enums/audit-action.enum';
import { AuditTarget } from '../common/enums/audit-target.enum';
import { PaginatedResult } from '../common/interfaces/paginated-result.interface';
import { AuditRepository } from './audit.repository';
import { ListAuditLogsQueryDto } from './dto/list-audit-logs-query.dto';
import { AuditLog } from './entities/audit-log.entity';

export interface AuditEntry {
  actorId?: string | null;
  hospitalId: string;
  action: AuditAction;
  targetType: AuditTarget;
  targetId?: string | null;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class AuditService {
  constructor(private readonly repository: AuditRepository, @InjectDataSource() private readonly dataSource: DataSource) {}

  record(entry: AuditEntry): Promise<AuditLog> {
    return this.repository.create({
      hospitalId: entry.hospitalId,
      actorId: entry.actorId ?? null,
      action: entry.action,
      targetType: entry.targetType,
      targetId: entry.targetId ?? null,
      metadata: entry.metadata ?? null,
    });
  }

  async recordPlatform(entry: Omit<AuditEntry, 'hospitalId'>): Promise<void> {
    await this.dataSource.query(`INSERT INTO "platform_audit_logs" ("actorId","action","targetType","targetId","metadata") VALUES ($1,$2,$3,$4,$5::jsonb)`, [entry.actorId ?? null, entry.action, entry.targetType, entry.targetId ?? null, JSON.stringify(entry.metadata ?? {})]);
  }

  list(query: ListAuditLogsQueryDto, hospitalId: string): Promise<PaginatedResult<AuditLog>> {
    return this.repository.search(query, hospitalId);
  }
}
