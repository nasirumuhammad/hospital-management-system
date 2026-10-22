import { registerDecorator, ValidationArguments, ValidationOptions } from 'class-validator';

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

function parseDateOnly(value: unknown): Date | null {
  if (typeof value !== 'string') return null;
  const match = DATE_ONLY.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return date;
}

export function IsValidDateOnly(options?: { notInFuture?: boolean }, validationOptions?: ValidationOptions): PropertyDecorator {
  return (target, propertyName) => registerDecorator({
    name: 'isValidDateOnly',
    target: target.constructor,
    propertyName: propertyName.toString(),
    options: validationOptions,
    validator: {
      validate(value: unknown): boolean {
        const parsed = parseDateOnly(value);
        if (!parsed) return false;
        if (!options?.notInFuture) return true;
        const parts = new Intl.DateTimeFormat('en', { timeZone: 'Africa/Lagos', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
        const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? '';
        const todayInNigeria = `${part('year')}-${part('month')}-${part('day')}`;
        return typeof value === 'string' && value <= todayInNigeria;
      },
      defaultMessage(args: ValidationArguments): string {
        if (options?.notInFuture) return `${args.property} must be a real date on or before today`;
        return `${args.property} must be a real date in YYYY-MM-DD format`;
      },
    },
  });
}

export function IsFutureDateTime(validationOptions?: ValidationOptions): PropertyDecorator {
  return (target, propertyName) => registerDecorator({
    name: 'isFutureDateTime',
    target: target.constructor,
    propertyName: propertyName.toString(),
    options: validationOptions,
    validator: {
      validate(value: unknown): boolean {
        if (typeof value !== 'string' || value.trim() === '') return false;
        const timestamp = Date.parse(value);
        return Number.isFinite(timestamp) && timestamp > Date.now();
      },
      defaultMessage(args: ValidationArguments): string {
        return `${args.property} must be a valid date and time in the future`;
      },
    },
  });
}

export function IsDateRangeEnd(validationOptions?: ValidationOptions): PropertyDecorator {
  return (target, propertyName) => registerDecorator({
    name: 'isDateRangeEnd',
    target: target.constructor,
    propertyName: propertyName.toString(),
    options: validationOptions,
    validator: {
      validate(value: unknown, args: ValidationArguments): boolean {
        const from = (args.object as Record<string, unknown>).from;
        if (from === undefined || from === null || from === '' || value === undefined || value === null || value === '') return true;
        const fromTime = Date.parse(String(from));
        const toTime = Date.parse(String(value));
        return Number.isFinite(fromTime) && Number.isFinite(toTime) && fromTime <= toTime;
      },
      defaultMessage(args: ValidationArguments): string {
        return `${args.property} must be on or after from`;
      },
    },
  });
}
