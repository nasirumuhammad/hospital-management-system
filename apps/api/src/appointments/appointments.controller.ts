import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { ListAppointmentsQueryDto } from './dto/list-appointments-query.dto';
import { RescheduleAppointmentDto } from './dto/reschedule-appointment.dto';
import { UpdateAppointmentStatusDto } from './dto/update-appointment-status.dto';

// Front-desk staff (receptionists, nurses) run the appointment book day to day; doctors work from it.
const APPOINTMENT_READERS = [UserRole.ADMIN, UserRole.DOCTOR, UserRole.NURSE, UserRole.RECEPTIONIST, UserRole.PATIENT];
const APPOINTMENT_SCHEDULERS = [UserRole.ADMIN, UserRole.NURSE, UserRole.RECEPTIONIST];

@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointments: AppointmentsService) {}

  @Get()
  @Roles(...APPOINTMENT_READERS)
  list(@Query() query: ListAppointmentsQueryDto, @CurrentUser() user: AuthenticatedUser) {
    return this.appointments.list(query, user);
  }

  @Get(':id')
  @Roles(...APPOINTMENT_READERS)
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.appointments.findOne(id, user);
  }

  @Post()
  @Roles(...APPOINTMENT_SCHEDULERS, UserRole.PATIENT)
  create(@Body() dto: CreateAppointmentDto, @CurrentUser() user: AuthenticatedUser) {
    return this.appointments.create(dto, user);
  }

  @Patch(':id/status')
  @Roles(...APPOINTMENT_SCHEDULERS, UserRole.DOCTOR)
  updateStatus(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateAppointmentStatusDto, @CurrentUser() user: AuthenticatedUser) {
    return this.appointments.updateStatus(id, dto.status, user);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.PATIENT)
  cancel(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.appointments.cancel(id, user);
  }

  @Patch(':id')
  @Roles(...APPOINTMENT_SCHEDULERS)
  reschedule(@Param('id', ParseUUIDPipe) id: string, @Body() dto: RescheduleAppointmentDto, @CurrentUser() user: AuthenticatedUser) {
    return this.appointments.reschedule(id, dto, user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(UserRole.ADMIN)
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.appointments.remove(id, user);
  }
}
