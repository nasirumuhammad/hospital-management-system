import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';
import { DEFAULT_LIMIT, DEFAULT_PAGE, MAX_LIMIT } from '../constants/pagination.constants';

export class PaginationQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page: number = DEFAULT_PAGE;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(MAX_LIMIT)
  limit: number = DEFAULT_LIMIT;

  /** A key from the endpoint's sort whitelist (unknown keys fall back to the default order). */
  @IsOptional() @IsString() @MaxLength(40) @Matches(/^[A-Za-z]+$/)
  sortBy?: string;

  @IsOptional() @IsIn(['asc', 'desc'])
  order?: 'asc' | 'desc';
}
