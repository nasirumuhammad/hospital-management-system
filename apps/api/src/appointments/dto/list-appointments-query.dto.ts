import { IsEnum, IsISO8601, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { IsDateRangeEnd } from '../../common/validators/date.decorators';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { AppointmentStatus } from '../../common/enums/appointment-status.enum';

export class ListAppointmentsQueryDto extends PaginationQueryDto {
  @IsOptional() @IsString() @MaxLength(100) q?: string;
  @IsOptional() @IsEnum(AppointmentStatus) status?: AppointmentStatus;
  @IsOptional() @IsUUID() doctorId?: string;
  @IsOptional() @IsUUID() patientId?: string;
  @IsOptional() @IsISO8601({ strict: true, strictSeparator: true }) from?: string;
  @IsOptional() @IsISO8601({ strict: true, strictSeparator: true }) @IsDateRangeEnd() to?: string;
}
