import { IsEnum, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { UserRole } from '../../common/enums/user-role.enum';
import { NormalizedEmail } from '../../common/validators/normalized-email.decorator';
import { IsNewPassword } from '../../common/validators/password.decorator';
import { Trimmed } from '../../common/validators/trimmed.decorator';

export class CreateUserDto {
  @NormalizedEmail() email: string;
  @Trimmed() @IsString() @IsNotEmpty() @MaxLength(100) name: string;
  @IsNewPassword() password: string;
  @IsEnum(UserRole) role: UserRole;
}
