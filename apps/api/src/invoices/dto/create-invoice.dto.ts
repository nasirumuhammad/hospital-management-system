import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Matches, Max, MaxLength, Min } from 'class-validator';
import { Trimmed } from '../../common/validators/trimmed.decorator';

const MAX_AMOUNT = 9_999_999_999.99;

export class CreateInvoiceDto {
  @IsUUID() patientId: string;
  @IsOptional() @IsUUID() appointmentId?: string;
  @Trimmed() @IsString() @IsNotEmpty() @MaxLength(180) description: string;
  @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0.01) @Max(MAX_AMOUNT) amount: number;
  @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'dueDate must be a YYYY-MM-DD date' }) dueDate?: string;
}
