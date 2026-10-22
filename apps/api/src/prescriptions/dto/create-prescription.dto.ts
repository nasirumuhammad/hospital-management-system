import { IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength, IsInt, Min, Max } from 'class-validator';
import { Trimmed } from '../../common/validators/trimmed.decorator';

export class CreatePrescriptionDto {
  @IsUUID() patientId: string;
  @IsUUID() medicalRecordId: string;
  @Trimmed() @IsString() @IsNotEmpty() @MaxLength(180) medication: string;
  @Trimmed() @IsString() @IsNotEmpty() @MaxLength(100) dosage: string;
  @Trimmed() @IsString() @IsNotEmpty() @MaxLength(100) frequency: string;
  @Trimmed() @IsString() @IsNotEmpty() @MaxLength(100) duration: string;
  @IsOptional() @Trimmed() @IsString() @IsNotEmpty() @MaxLength(2000) instructions?: string;
  @IsOptional() @IsUUID() drugId?: string;
  @IsOptional() @IsInt() @Min(1) @Max(100000) quantityPrescribed?: number;
}
