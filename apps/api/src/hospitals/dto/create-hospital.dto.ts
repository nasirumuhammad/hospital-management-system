import { IsEmail, IsNotEmpty, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { IsNewPassword } from '../../common/validators/password.decorator';
import { NormalizedEmail } from '../../common/validators/normalized-email.decorator';
import { Trimmed } from '../../common/validators/trimmed.decorator';

export class CreateHospitalDto {
  @Trimmed() @IsString() @IsNotEmpty() @MaxLength(150) name: string;
  @Trimmed() @IsString() @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, { message: 'slug must be lowercase letters, numbers, and single hyphens' }) @MaxLength(60) slug: string;
  @IsOptional() @Trimmed() @IsString() @MaxLength(30) phone?: string | null;
  @IsOptional() @Trimmed() @IsString() @MaxLength(2000) address?: string | null;
  @Trimmed() @IsString() @Matches(/^[A-Z0-9]{2,10}$/) patientNumberPrefix: string;
  @NormalizedEmail() adminEmail: string;
  @Trimmed() @IsString() @IsNotEmpty() @MaxLength(100) adminName: string;
  @IsNewPassword() adminPassword: string;
}
