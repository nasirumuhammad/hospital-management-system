import { Module } from '@nestjs/common';
import { AppointmentsModule } from '../appointments/appointments.module';
import { DoctorsModule } from '../doctors/doctors.module';
import { InvoicesModule } from '../invoices/invoices.module';
import { PatientsModule } from '../patients/patients.module';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [PatientsModule, DoctorsModule, AppointmentsModule, InvoicesModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
