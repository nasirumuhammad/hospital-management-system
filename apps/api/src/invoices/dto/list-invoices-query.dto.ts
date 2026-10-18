import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { InvoiceStatus } from '../../common/enums/invoice-status.enum';

export class ListInvoicesQueryDto extends PaginationQueryDto {
  @IsOptional() @IsUUID() patientId?: string;
  @IsOptional() @IsEnum(InvoiceStatus) status?: InvoiceStatus;
}
