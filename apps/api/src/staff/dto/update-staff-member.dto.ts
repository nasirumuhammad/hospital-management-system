import { PartialType } from '@nestjs/mapped-types';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateStaffMemberDto } from './create-staff-member.dto';

export class UpdateStaffMemberDto extends PartialType(CreateStaffMemberDto) {
  @IsOptional() @IsBoolean() isActive?: boolean;
}
