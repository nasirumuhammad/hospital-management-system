import { IsISO8601, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { Trimmed } from '../../common/validators/trimmed.decorator';

const MAX_REASON_LENGTH = 2000;

export class CreateAppointmentDto {
  @IsOptional() @IsUUID() patientId?: string;
  @IsUUID() doctorId: string;
  @IsISO8601() scheduledAt: string;
  @IsOptional() @Trimmed() @IsString() @MaxLength(MAX_REASON_LENGTH) reason?: string;
}
