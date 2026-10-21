import { IsEnum, IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { Gender } from '../../common/enums/gender.enum';
import { NormalizedEmail } from '../../common/validators/normalized-email.decorator';
import { Trimmed } from '../../common/validators/trimmed.decorator';

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export class CreatePatientDto {
  @Trimmed() @IsString() @IsNotEmpty() @MaxLength(100) firstName: string;
  @Trimmed() @IsString() @IsNotEmpty() @MaxLength(100) lastName: string;
  @IsOptional() @NormalizedEmail() email?: string | null;
  @Trimmed() @IsString() @IsNotEmpty() @MaxLength(30) phone: string;
  @IsOptional() @Trimmed() @IsString() @MaxLength(100) middleName?: string | null;
  @IsOptional() @Matches(ISO_DATE_PATTERN, { message: 'dateOfBirth must be a YYYY-MM-DD date' }) dateOfBirth?: string | null;
  @IsEnum(Gender) gender: Gender;
  @IsOptional() @Trimmed() @IsString() @MaxLength(500) address?: string | null;
  @IsOptional() @Trimmed() @IsString() @MaxLength(150) nextOfKinName?: string | null;
  @IsOptional() @Trimmed() @IsString() @MaxLength(30) nextOfKinPhone?: string | null;
  @IsOptional() @Trimmed() @IsString() @MaxLength(50) nextOfKinRelationship?: string | null;
}
