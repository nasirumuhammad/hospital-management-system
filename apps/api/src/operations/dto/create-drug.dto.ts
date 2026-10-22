import { IsIn, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
export class CreateDrugDto {
  @IsString() @IsNotEmpty() @MaxLength(120) genericName: string;
  @IsOptional() @IsString() @MaxLength(120) brandName?: string;
  @IsIn(['TABLET','CAPSULE','SYRUP','INJECTION','CREAM','OTHER']) form: string;
  @IsOptional() @IsString() @MaxLength(40) strength?: string;
  @IsString() @IsNotEmpty() @MaxLength(20) dispensingUnit: string;
  @IsOptional() @IsInt() @Min(0) @Max(1000000) reorderLevel?: number;
  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(100_000_000) unitPrice?: number;
}
