import { IsBoolean } from 'class-validator';
export class UpdateHospitalStatusDto { @IsBoolean() isActive: boolean; }
