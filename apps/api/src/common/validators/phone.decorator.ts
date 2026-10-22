import { applyDecorators } from '@nestjs/common';
import { IsString, MaxLength, Matches } from 'class-validator';
import { Trimmed } from './trimmed.decorator';

// Accept common local and international phone formatting without accepting letters or short values.
export function IsPhoneLike() {
  return applyDecorators(
    Trimmed(),
    IsString(),
    MaxLength(30),
    Matches(/^\+?[0-9](?:[0-9\s().-]*[0-9])?$/, { message: 'phone must contain only digits and common phone separators' }),
    Matches(/^(?=(?:\D*\d){7,15}\D*$).+$/, { message: 'phone must contain between 7 and 15 digits' }),
  );
}
