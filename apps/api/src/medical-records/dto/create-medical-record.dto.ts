import { IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { Trimmed } from '../../common/validators/trimmed.decorator';

const MAX_TEXT_LENGTH = 10_000;

export class CreateMedicalRecordDto {
  @IsUUID() patientId: string;
  @IsOptional() @IsUUID() appointmentId?: string;
  @Trimmed() @IsString() @IsNotEmpty() @MaxLength(180) diagnosis: string;
  @Trimmed() @IsString() @IsNotEmpty() @MaxLength(MAX_TEXT_LENGTH) notes: string;
  @IsOptional() @Trimmed() @IsString() @MaxLength(MAX_TEXT_LENGTH) allergies?: string | null;
  @IsOptional() @Trimmed() @IsString() @MaxLength(MAX_TEXT_LENGTH) treatmentPlan?: string | null;
}
