import { IsISO8601, IsOptional, IsString, MaxLength } from 'class-validator';
import { Trimmed } from '../../common/validators/trimmed.decorator';

const MAX_REASON_LENGTH = 2000;

export class RescheduleAppointmentDto {
  @IsISO8601() scheduledAt: string;
  @IsOptional() @Trimmed() @IsString() @MaxLength(MAX_REASON_LENGTH) reason?: string;
}
