import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaginatedResult } from '../common/interfaces/paginated-result.interface';
import { paginate } from '../common/utils/pagination.util';
import { ListAuditLogsQueryDto } from './dto/list-audit-logs-query.dto';
import { AuditLog } from './entities/audit-log.entity';

@Injectable()
export class AuditRepository {
  constructor(@InjectRepository(AuditLog) private readonly repository: Repository<AuditLog>) {}

  create(entry: Partial<AuditLog>): Promise<AuditLog> {
    return this.repository.save(this.repository.create(entry));
  }

  search(query: ListAuditLogsQueryDto): Promise<PaginatedResult<AuditLog>> {
    const builder = this.repository.createQueryBuilder('log').orderBy('log.createdAt', 'DESC');
    if (query.action) builder.andWhere('log.action = :action', { action: query.action });
    if (query.targetType) builder.andWhere('log.targetType = :targetType', { targetType: query.targetType });
    if (query.actorId) builder.andWhere('log.actorId = :actorId', { actorId: query.actorId });
    if (query.from) builder.andWhere('log.createdAt >= :from', { from: query.from });
    if (query.to) builder.andWhere('log.createdAt <= :to', { to: query.to });
    return paginate(builder, query);
  }
}
