import { IsString, MaxLength, MinLength } from 'class-validator';
import { IsNewPassword } from '../../common/validators/password.decorator';

const MAX_TOKEN_LENGTH = 200;

export class ResetPasswordDto {
  @IsString() @MinLength(1) @MaxLength(MAX_TOKEN_LENGTH) token: string;
  @IsNewPassword() newPassword: string;
}
