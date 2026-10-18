import { IsOptional, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class ListMedicalRecordsQueryDto extends PaginationQueryDto {
  @IsOptional() @IsUUID() patientId?: string;
}
