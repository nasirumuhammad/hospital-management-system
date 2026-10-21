import { IsDateString, IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
export class ReceiveDrugBatchDto {
  @IsString() @IsNotEmpty() @MaxLength(50) batchNumber: string;
  @IsDateString() expiryDate: string;
  @IsInt() @Min(1) @Max(10000000) quantityReceived: number;
  @IsOptional() @IsString() @MaxLength(150) supplier?: string;
}
