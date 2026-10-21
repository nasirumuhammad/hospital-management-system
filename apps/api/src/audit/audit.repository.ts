import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaginatedResult } from '../common/interfaces/paginated-result.interface';
import { paginate } from '../common/utils/pagination.util';
import { applySort, SortMap } from '../common/utils/sort.util';
import { ListAuditLogsQueryDto } from './dto/list-audit-logs-query.dto';
import { AuditLog } from './entities/audit-log.entity';

const SORTABLE: SortMap = {
  createdAt: 'log.createdAt',
  action: 'log.action',
  targetType: 'log.targetType',
};

@Injectable()
export class AuditRepository {
  constructor(@InjectRepository(AuditLog) private readonly repository: Repository<AuditLog>) {}

  create(entry: Partial<AuditLog>): Promise<AuditLog> {
    return this.repository.save(this.repository.create(entry));
  }

  search(query: ListAuditLogsQueryDto, hospitalId: string): Promise<PaginatedResult<AuditLog>> {
    const builder = this.repository.createQueryBuilder('log').where('log.hospitalId = :hospitalId', { hospitalId });
    if (query.action) builder.andWhere('log.action = :action', { action: query.action });
    if (query.targetType) builder.andWhere('log.targetType = :targetType', { targetType: query.targetType });
    if (query.actorId) builder.andWhere('log.actorId = :actorId', { actorId: query.actorId });
    if (query.from) builder.andWhere('log.createdAt >= :from', { from: query.from });
    if (query.to) builder.andWhere('log.createdAt <= :to', { to: query.to });
    applySort(builder, query, SORTABLE, { sortBy: 'createdAt', order: 'desc' }, 'log.id');
    return paginate(builder, query);
  }
}
