import { IsNumber, Max, Min } from 'class-validator';

export class SetPriceDto {
  @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(100_000_000) price: number;
}
