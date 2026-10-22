import { IsISO8601, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { Trimmed } from '../../common/validators/trimmed.decorator';
import { IsFutureDateTime } from '../../common/validators/date.decorators';

const MAX_REASON_LENGTH = 2000;

export class CreateAppointmentDto {
  @IsOptional() @IsUUID() patientId?: string;
  @IsUUID() doctorId: string;
  @IsISO8601({ strict: true, strictSeparator: true }) @IsFutureDateTime() scheduledAt: string;
  @IsOptional() @Trimmed() @IsString() @IsNotEmpty() @MaxLength(MAX_REASON_LENGTH) reason?: string;
}
