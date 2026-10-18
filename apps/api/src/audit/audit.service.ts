import { Injectable } from '@nestjs/common';
import { AuditAction } from '../common/enums/audit-action.enum';
import { AuditTarget } from '../common/enums/audit-target.enum';
import { PaginatedResult } from '../common/interfaces/paginated-result.interface';
import { AuditRepository } from './audit.repository';
import { ListAuditLogsQueryDto } from './dto/list-audit-logs-query.dto';
import { AuditLog } from './entities/audit-log.entity';

export interface AuditEntry {
  actorId?: string | null;
  action: AuditAction;
  targetType: AuditTarget;
  targetId?: string | null;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class AuditService {
  constructor(private readonly repository: AuditRepository) {}

  record(entry: AuditEntry): Promise<AuditLog> {
    return this.repository.create({
      actorId: entry.actorId ?? null,
      action: entry.action,
      targetType: entry.targetType,
      targetId: entry.targetId ?? null,
      metadata: entry.metadata ?? null,
    });
  }

  list(query: ListAuditLogsQueryDto): Promise<PaginatedResult<AuditLog>> {
    return this.repository.search(query);
  }
}
