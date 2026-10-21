import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { CreatePrescriptionDto } from './dto/create-prescription.dto';
import { ListPrescriptionsQueryDto } from './dto/list-prescriptions-query.dto';
import { PrescriptionsService } from './prescriptions.service';

@Controller('prescriptions')
export class PrescriptionsController {
  constructor(private readonly prescriptions: PrescriptionsService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.DOCTOR, UserRole.PATIENT, UserRole.PHARMACIST)
  list(@Query() query: ListPrescriptionsQueryDto, @CurrentUser() user: AuthenticatedUser) {
    return this.prescriptions.list(query, user);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.DOCTOR, UserRole.PATIENT, UserRole.PHARMACIST)
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.prescriptions.findOne(id, user);
  }

  @Post()
  @Roles(UserRole.DOCTOR)
  create(@Body() dto: CreatePrescriptionDto, @CurrentUser() user: AuthenticatedUser) {
    return this.prescriptions.create(dto, user);
  }
}
