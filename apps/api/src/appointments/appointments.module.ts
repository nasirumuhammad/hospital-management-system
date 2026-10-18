import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DoctorsModule } from '../doctors/doctors.module';
import { PatientsModule } from '../patients/patients.module';
import { AppointmentsController } from './appointments.controller';
import { AppointmentsRepository } from './appointments.repository';
import { AppointmentsService } from './appointments.service';
import { Appointment } from './entities/appointment.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Appointment]), PatientsModule, DoctorsModule],
  controllers: [AppointmentsController],
  providers: [AppointmentsRepository, AppointmentsService],
  exports: [AppointmentsService, AppointmentsRepository],
})
export class AppointmentsModule {}
