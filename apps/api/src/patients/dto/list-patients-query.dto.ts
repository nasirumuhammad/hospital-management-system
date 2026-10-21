import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class ListPatientsQueryDto extends PaginationQueryDto {
  /** Matches name, email, phone or the patient id (full or partial). */
  @IsOptional() @IsString() @MaxLength(100) q?: string;
  @IsOptional() @IsIn(['MALE', 'FEMALE']) gender?: string;
}
