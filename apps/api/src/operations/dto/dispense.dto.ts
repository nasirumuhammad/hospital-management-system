import { IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';
export class DispensePrescriptionDto { @IsInt() @Min(1) @Max(100000) quantity: number; }
export class WalkInDispenseDto {
  @IsUUID() drugId: string;
  @IsInt() @Min(1) @Max(100000) quantity: number;
  @IsOptional() @IsString() @MaxLength(120) customerName?: string;
}
export class StockAdjustmentDto {
  @IsInt() @Min(-10000000) @Max(10000000) quantityDelta: number;
  @IsString() @MaxLength(30) reason: 'WRITE_OFF'|'RETURN'|'CORRECTION'|'DAMAGE'|'EXPIRED'|'RECALL';
  @IsOptional() @IsString() @MaxLength(4000) notes?: string;
}
