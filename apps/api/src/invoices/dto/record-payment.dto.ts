import { Type } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { PaymentMethod } from '../../common/enums/payment-method.enum';
import { Trimmed } from '../../common/validators/trimmed.decorator';

const MAX_AMOUNT = 9_999_999_999.99;

export class RecordPaymentDto {
  @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0.01) @Max(MAX_AMOUNT) amount: number;
  @IsEnum(PaymentMethod) method: PaymentMethod;
  @IsOptional() @Trimmed() @IsString() @MaxLength(100) reference?: string;
}
