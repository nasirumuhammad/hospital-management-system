import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { CreatePatientDto } from './dto/create-patient.dto';
import { ListPatientsQueryDto } from './dto/list-patients-query.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { PatientsService } from './patients.service';

@Controller('patients')
export class PatientsController {
  constructor(private readonly patients: PatientsService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.DOCTOR)
  list(@Query() query: ListPatientsQueryDto) {
    return this.patients.list(query);
  }

  @Get('me')
  @Roles(UserRole.PATIENT)
  myProfile(@CurrentUser() user: AuthenticatedUser) {
    return this.patients.findByUserIdOrFail(user.id);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.DOCTOR)
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.patients.findOrFail(id);
  }

  @Post()
  @Roles(UserRole.ADMIN)
  create(@Body() dto: CreatePatientDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.patients.create(dto, actor);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdatePatientDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.patients.update(id, dto, actor);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(UserRole.ADMIN)
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.patients.remove(id, actor);
  }
}
