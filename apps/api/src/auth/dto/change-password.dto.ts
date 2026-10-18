import { IsString, MaxLength, MinLength } from 'class-validator';
import { MAX_LOGIN_PASSWORD_LENGTH } from '../../common/constants/auth.constants';
import { IsNewPassword } from '../../common/validators/password.decorator';

export class ChangePasswordDto {
  @IsString() @MinLength(1) @MaxLength(MAX_LOGIN_PASSWORD_LENGTH) currentPassword: string;
  @IsNewPassword() newPassword: string;
}
