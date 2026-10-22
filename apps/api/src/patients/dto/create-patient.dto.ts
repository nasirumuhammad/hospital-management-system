import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { Gender } from '../../common/enums/gender.enum';
import { NormalizedEmail } from '../../common/validators/normalized-email.decorator';
import { Trimmed } from '../../common/validators/trimmed.decorator';
import { IsValidDateOnly } from '../../common/validators/date.decorators';
import { IsPhoneLike } from '../../common/validators/phone.decorator';

export class CreatePatientDto {
  @Trimmed() @IsString() @IsNotEmpty() @MaxLength(100) firstName: string;
  @Trimmed() @IsString() @IsNotEmpty() @MaxLength(100) lastName: string;
  @IsOptional() @NormalizedEmail() email?: string | null;
  @IsPhoneLike() phone: string;
  @IsOptional() @Trimmed() @IsString() @MaxLength(100) middleName?: string | null;
  @IsOptional() @IsValidDateOnly({ notInFuture: true }) dateOfBirth?: string | null;
  @IsEnum(Gender) gender: Gender;
  @IsOptional() @Trimmed() @IsString() @MaxLength(500) address?: string | null;
  @IsOptional() @Trimmed() @IsString() @MaxLength(150) nextOfKinName?: string | null;
  @IsOptional() @Trimmed() @IsString() @MaxLength(30) nextOfKinPhone?: string | null;
  @IsOptional() @Trimmed() @IsString() @MaxLength(50) nextOfKinRelationship?: string | null;
}
