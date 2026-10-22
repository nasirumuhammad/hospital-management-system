import { IsISO8601, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { Trimmed } from '../../common/validators/trimmed.decorator';
import { IsFutureDateTime } from '../../common/validators/date.decorators';

const MAX_REASON_LENGTH = 2000;

export class RescheduleAppointmentDto {
  @IsISO8601({ strict: true, strictSeparator: true }) @IsFutureDateTime() scheduledAt: string;
  @IsOptional() @Trimmed() @IsString() @IsNotEmpty() @MaxLength(MAX_REASON_LENGTH) reason?: string;
}
