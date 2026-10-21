import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { CreateHospitalDto } from './dto/create-hospital.dto';
import { UpdateHospitalStatusDto } from './dto/update-hospital-status.dto';
import { HospitalsService } from './hospitals.service';

@Controller('platform/hospitals')
@Roles(UserRole.SUPER_ADMIN)
export class HospitalsController {
  constructor(private readonly hospitals: HospitalsService) {}

  @Get() list() { return this.hospitals.list(); }
  @Get(':id') findOne(@Param('id', ParseUUIDPipe) id: string) { return this.hospitals.findOrFail(id); }
  @Post() create(@Body() dto: CreateHospitalDto, @CurrentUser() actor: AuthenticatedUser) { return this.hospitals.create(dto, actor); }
  @Patch(':id/status') setActive(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateHospitalStatusDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.hospitals.setActive(id, dto.isActive, actor);
  }
}
