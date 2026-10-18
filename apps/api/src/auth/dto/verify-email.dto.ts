import { IsString, MaxLength, MinLength } from 'class-validator';

const MAX_TOKEN_LENGTH = 200;

export class VerifyEmailDto {
  @IsString() @MinLength(1) @MaxLength(MAX_TOKEN_LENGTH) token: string;
}
