import { IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, IsIn, Max, MaxLength, Min } from 'class-validator';
export class CreateTriageDto {
  @IsString() @IsNotEmpty() @MaxLength(4000) chiefComplaint: string;
  @IsOptional() @IsNumber() @Min(25) @Max(45) temperatureC?: number;
  @IsOptional() @IsInt() @Min(1) @Max(300) pulseBpm?: number;
  @IsOptional() @IsInt() @Min(1) @Max(100) respiratoryRate?: number;
  @IsOptional() @IsInt() @Min(40) @Max(300) systolicBp?: number;
  @IsOptional() @IsInt() @Min(20) @Max(200) diastolicBp?: number;
  @IsOptional() @IsInt() @Min(0) @Max(100) spo2?: number;
  @IsOptional() @IsNumber() @Min(0.1) @Max(500) weightKg?: number;
  @IsOptional() @IsNumber() @Min(10) @Max(260) heightCm?: number;
  @IsOptional() @IsString() @MaxLength(4000) notes?: string;
  @IsOptional() @IsIn(['NORMAL','URGENT']) priority?: 'NORMAL'|'URGENT';
}
