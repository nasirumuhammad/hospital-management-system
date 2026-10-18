import { applyDecorators } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { IsEmail, MaxLength } from 'class-validator';

const MAX_EMAIL_LENGTH = 180;

export function NormalizedEmail() {
  return applyDecorators(
    Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value)),
    IsEmail(),
    MaxLength(MAX_EMAIL_LENGTH),
  );
}
