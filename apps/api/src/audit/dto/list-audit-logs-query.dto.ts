import { IsEnum, IsISO8601, IsOptional, IsUUID } from 'class-validator';
import { IsDateRangeEnd } from '../../common/validators/date.decorators';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { AuditAction } from '../../common/enums/audit-action.enum';
import { AuditTarget } from '../../common/enums/audit-target.enum';

export class ListAuditLogsQueryDto extends PaginationQueryDto {
  @IsOptional() @IsEnum(AuditAction) action?: AuditAction;
  @IsOptional() @IsEnum(AuditTarget) targetType?: AuditTarget;
  @IsOptional() @IsUUID() actorId?: string;
  @IsOptional() @IsISO8601({ strict: true, strictSeparator: true }) from?: string;
  @IsOptional() @IsISO8601({ strict: true, strictSeparator: true }) @IsDateRangeEnd() to?: string;
}
