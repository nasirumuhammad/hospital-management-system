import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { NormalizedEmail } from '../../common/validators/normalized-email.decorator';
import { Trimmed } from '../../common/validators/trimmed.decorator';

export class CreateDoctorDto {
  @Trimmed() @IsString() @IsNotEmpty() @MaxLength(100) firstName: string;
  @Trimmed() @IsString() @IsNotEmpty() @MaxLength(100) lastName: string;
  @NormalizedEmail() email: string;
  @Trimmed() @IsString() @IsNotEmpty() @MaxLength(120) specialty: string;
  @IsOptional() @Trimmed() @IsString() @MaxLength(30) phone?: string | null;
  @IsOptional() @Trimmed() @IsString() @MaxLength(180) qualification?: string | null;
}
