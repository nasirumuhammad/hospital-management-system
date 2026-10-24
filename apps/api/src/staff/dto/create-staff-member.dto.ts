import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { UserRole } from '../../common/enums/user-role.enum';
import { NormalizedEmail } from '../../common/validators/normalized-email.decorator';
import { IsPhoneLike } from '../../common/validators/phone.decorator';
import { Trimmed } from '../../common/validators/trimmed.decorator';
import { STAFF_ROLES } from '../staff-roles';

export class CreateStaffMemberDto {
  @Trimmed() @IsString() @IsNotEmpty() @MaxLength(100) firstName: string;
  @Trimmed() @IsString() @IsNotEmpty() @MaxLength(100) lastName: string;
  @NormalizedEmail() email: string;
  @IsIn(STAFF_ROLES) role: UserRole;
  @IsOptional() @IsPhoneLike() phone?: string | null;
  @IsOptional() @Trimmed() @IsString() @MaxLength(120) jobTitle?: string | null;
}
