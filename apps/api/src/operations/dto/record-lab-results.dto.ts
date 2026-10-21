import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsNotEmpty, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';

export class LabResultValueDto {
  @IsString() @IsNotEmpty() @MaxLength(80) parameterName: string;
  @IsString() @IsNotEmpty() @MaxLength(60) value: string;
  @IsOptional() @IsString() @MaxLength(20) unit?: string | null;
}

export class RecordLabResultsDto {
  @IsArray() @ArrayMinSize(1) @ValidateNested({ each: true }) @Type(() => LabResultValueDto)
  results: LabResultValueDto[];
}
