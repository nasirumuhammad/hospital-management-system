import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { CreateMedicalRecordDto } from './dto/create-medical-record.dto';
import { ListMedicalRecordsQueryDto } from './dto/list-medical-records-query.dto';
import { UpdateMedicalRecordDto } from './dto/update-medical-record.dto';
import { MedicalRecordsService } from './medical-records.service';

@Controller('medical-records')
export class MedicalRecordsController {
  constructor(private readonly records: MedicalRecordsService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.DOCTOR, UserRole.NURSE, UserRole.PATIENT)
  list(@Query() query: ListMedicalRecordsQueryDto, @CurrentUser() user: AuthenticatedUser) {
    return this.records.list(query, user);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.DOCTOR, UserRole.NURSE, UserRole.PATIENT)
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.records.findOne(id, user);
  }

  @Post()
  @Roles(UserRole.DOCTOR)
  create(@Body() dto: CreateMedicalRecordDto, @CurrentUser() user: AuthenticatedUser) {
    return this.records.create(dto, user);
  }

  @Patch(':id')
  @Roles(UserRole.DOCTOR)
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateMedicalRecordDto, @CurrentUser() user: AuthenticatedUser) {
    return this.records.update(id, dto, user);
  }
}
