import { Transform } from 'class-transformer';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
import { MAX_LOGIN_PASSWORD_LENGTH } from '../../common/constants/auth.constants';

export class LoginDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail()
  email: string;

  @IsString() @MinLength(1) @MaxLength(MAX_LOGIN_PASSWORD_LENGTH)
  password: string;
}
