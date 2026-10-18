import { applyDecorators } from '@nestjs/common';
import { IsString, MinLength, Validate, ValidationArguments, ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';
import { MAX_PASSWORD_BYTES, MIN_PASSWORD_LENGTH } from '../constants/auth.constants';

@ValidatorConstraint({ name: 'passwordByteLength', async: false })
class PasswordByteLengthConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    return typeof value === 'string' && Buffer.byteLength(value, 'utf8') <= MAX_PASSWORD_BYTES;
  }

  defaultMessage(args: ValidationArguments): string {
    return `${args.property} must be at most ${MAX_PASSWORD_BYTES} bytes`;
  }
}

export function IsNewPassword() {
  return applyDecorators(IsString(), MinLength(MIN_PASSWORD_LENGTH), Validate(PasswordByteLengthConstraint));
}
