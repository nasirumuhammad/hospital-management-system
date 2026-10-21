import { ArrayMinSize, IsArray, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
export class CreateLabOrderDto {
  @IsUUID() visitId: string;
  @IsOptional() @IsUUID() medicalRecordId?: string;
  @IsOptional() @IsString() @MaxLength(4000) clinicalNote?: string;
  @IsArray() @ArrayMinSize(1) @IsUUID('all', { each: true }) labTestIds: string[];
}
