import { IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
export class CreateVisitDto {
  @IsUUID() patientId: string;
  @IsIn(['WALK_IN','APPOINTMENT','REFERRAL','EMERGENCY']) source: 'WALK_IN'|'APPOINTMENT'|'REFERRAL'|'EMERGENCY';
  @IsOptional() @IsUUID() appointmentId?: string;
  @IsOptional() @IsUUID() payerId?: string;
  @IsOptional() @IsUUID() doctorId?: string;
  @IsOptional() @IsIn(['NORMAL','URGENT']) priority?: 'NORMAL'|'URGENT';
}
