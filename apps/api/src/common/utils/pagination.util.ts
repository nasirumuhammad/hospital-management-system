import { ObjectLiteral, SelectQueryBuilder } from 'typeorm';
import { PaginatedResult } from '../interfaces/paginated-result.interface';

interface PageRequest {
  page: number;
  limit: number;
}

export async function paginate<T extends ObjectLiteral>(
  queryBuilder: SelectQueryBuilder<T>,
  { page, limit }: PageRequest,
): Promise<PaginatedResult<T>> {
  const [items, total] = await queryBuilder
    .skip((page - 1) * limit)
    .take(limit)
    .getManyAndCount();
  return { items, total, page, limit, pages: Math.max(1, Math.ceil(total / limit)) };
}
