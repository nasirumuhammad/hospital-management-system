import { IsDateString, IsIn, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';

export class CreateWardDto { @IsString() @IsNotEmpty() @MaxLength(100) name: string; @IsOptional() @IsString() @MaxLength(30) wardType?: string; }
export class CreateBedDto { @IsString() @IsNotEmpty() @MaxLength(30) bedNumber: string; }
export class AdmitPatientDto { @IsUUID() visitId: string; @IsUUID() bedId: string; @IsOptional() @IsString() @MaxLength(4000) diagnosis?: string; }
export class DischargePatientDto { @IsOptional() @IsString() @MaxLength(10000) dischargeSummary?: string; }
export class NursingObservationDto {
  @IsOptional() @IsNumber() @Min(25) @Max(45) temperatureC?: number;
  @IsOptional() @IsInt() @Min(1) @Max(300) pulseBpm?: number;
  @IsOptional() @IsInt() @Min(1) @Max(100) respiratoryRate?: number;
  @IsOptional() @IsInt() @Min(40) @Max(300) systolicBp?: number;
  @IsOptional() @IsInt() @Min(20) @Max(200) diastolicBp?: number;
  @IsOptional() @IsInt() @Min(0) @Max(100) spo2?: number;
  @IsOptional() @IsInt() @Min(0) @Max(10) painScore?: number;
  @IsOptional() @IsString() @MaxLength(4000) notes?: string;
}
export class CreateAntenatalDto { @IsUUID() patientId: string; @IsOptional() @IsDateString() lmpDate?: string; @IsOptional() @IsDateString() eddDate?: string; @IsOptional() @IsInt() @Min(0) @Max(30) gravida?: number; @IsOptional() @IsInt() @Min(0) @Max(30) para?: number; @IsOptional() @IsString() @MaxLength(5) bloodGroup?: string; @IsOptional() @IsString() @MaxLength(4000) riskNotes?: string; }
export class AntenatalVisitDto { @IsDateString() visitDate: string; @IsOptional() @IsInt() @Min(0) @Max(45) gestationalWeeks?: number; @IsOptional() @IsNumber() @Min(0.1) @Max(500) weightKg?: number; @IsOptional() @IsString() @MaxLength(20) bloodPressure?: string; @IsOptional() @IsInt() @Min(1) @Max(250) foetalHeartRate?: number; @IsOptional() @IsString() @MaxLength(4000) notes?: string; }
export class ImmunizationDto { @IsUUID() patientId: string; @IsString() @IsNotEmpty() @MaxLength(100) vaccineName: string; @IsOptional() @IsString() @MaxLength(40) dose?: string; @IsDateString() administeredAt: string; @IsOptional() @IsString() @MaxLength(50) batchNumber?: string; @IsOptional() @IsString() @MaxLength(4000) notes?: string; }
export class FamilyPlanningDto { @IsUUID() patientId: string; @IsString() @IsNotEmpty() @MaxLength(100) method: string; @IsDateString() startedAt: string; @IsOptional() @IsDateString() reviewAt?: string; @IsOptional() @IsString() @MaxLength(4000) notes?: string; }
export class CreateServiceDto { @IsString() @IsNotEmpty() @MaxLength(30) code: string; @IsString() @IsNotEmpty() @MaxLength(120) name: string; @IsString() @IsNotEmpty() @MaxLength(40) category: string; }
export class CreateServicePriceDto { @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) amount: number; @IsOptional() @IsUUID() payerId?: string; @IsOptional() @IsDateString() effectiveFrom?: string; @IsOptional() @IsDateString() effectiveTo?: string; }
export class AddInvoiceItemDto { @IsOptional() @IsUUID() serviceId?: string; @IsString() @IsNotEmpty() @MaxLength(180) description: string; @IsInt() @Min(1) @Max(100000) quantity: number; @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) unitPrice: number; }
export class CreateClaimDto { @IsUUID() payerId: string; @IsUUID() invoiceId: string; @IsIn(['CAPITATION','FEE_FOR_SERVICE']) claimType: string; @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) amountClaimed: number; @IsOptional() @IsString() @MaxLength(80) claimNumber?: string; }
export class UpdateClaimDto { @IsIn(['SUBMITTED','ACCEPTED','PARTIAL','REJECTED','PAID']) status: string; @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) amountApproved?: number; @IsOptional() @IsString() @MaxLength(4000) notes?: string; }
export class OpenShiftDto { @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) openingFloat: number; }
export class CloseShiftDto { @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) countedCash: number; @IsOptional() @IsString() @MaxLength(4000) notes?: string; }
export class CreateAllergyDto { @IsString() @IsNotEmpty() @MaxLength(120) allergen: string; @IsOptional() @IsString() @MaxLength(200) reaction?: string; @IsOptional() @IsIn(['MILD','MODERATE','SEVERE']) severity?: string; }
export class ReviewAllergiesDto { @IsOptional() @IsString() @MaxLength(1000) note?: string; }
export class CreatePayerDto { @IsString() @IsNotEmpty() @MaxLength(120) name: string; @IsIn(['HMO','NHIA','CORPORATE']) type: string; }
export class CreateCoverageDto { @IsUUID() payerId: string; @IsString() @IsNotEmpty() @MaxLength(50) enrolleeNumber: string; @IsOptional() @IsString() @MaxLength(80) planName?: string; @IsOptional() @IsString() @MaxLength(150) principalName?: string; @IsOptional() @IsDateString() expiresAt?: string; }
export class CreateAuthorizationDto { @IsUUID() payerId: string; @IsString() @IsNotEmpty() @MaxLength(120) scope: string; @IsOptional() @IsString() @MaxLength(60) code?: string; @IsOptional() @IsString() @MaxLength(4000) note?: string; }
export class UpdateAuthorizationDto { @IsIn(['APPROVED','DENIED','EXPIRED']) status: string; @IsOptional() @IsString() @MaxLength(60) code?: string; @IsOptional() @IsString() @MaxLength(4000) note?: string; }
export class CreateLabTestDto { @IsString() @IsNotEmpty() @MaxLength(20) code: string; @IsString() @IsNotEmpty() @MaxLength(120) name: string; @IsString() @IsNotEmpty() @MaxLength(60) category: string; @IsOptional() @IsString() @MaxLength(40) specimen?: string; @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(100_000_000) price?: number; }
export class CreateLabParameterDto { @IsString() @IsNotEmpty() @MaxLength(80) name: string; @IsOptional() @IsString() @MaxLength(20) unit?: string; @IsOptional() @IsInt() @Min(0) @Max(10000) sortOrder?: number; }
export class CreateLabRangeDto { @IsOptional() @IsIn(['MALE','FEMALE']) sex?: string; @IsOptional() @IsNumber() @Min(0) @Max(130) minAgeYears?: number; @IsOptional() @IsNumber() @Min(0) @Max(130) maxAgeYears?: number; @IsOptional() @IsNumber() refLow?: number; @IsOptional() @IsNumber() refHigh?: number; }
export class CreateDiagnosisDto { @IsOptional() @IsString() @MaxLength(10) icd10Code?: string; @IsString() @IsNotEmpty() @MaxLength(200) description: string; @IsIn(['PRIMARY','SECONDARY']) type: string; }
