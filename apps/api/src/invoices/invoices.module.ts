import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppointmentsModule } from '../appointments/appointments.module';
import { PatientsModule } from '../patients/patients.module';
import { Invoice } from './entities/invoice.entity';
import { Payment } from './entities/payment.entity';
import { InvoicesController } from './invoices.controller';
import { InvoicesRepository } from './invoices.repository';
import { InvoicesService } from './invoices.service';

@Module({
  imports: [TypeOrmModule.forFeature([Invoice, Payment]), AppointmentsModule, PatientsModule],
  controllers: [InvoicesController],
  providers: [InvoicesRepository, InvoicesService],
  exports: [InvoicesService],
})
export class InvoicesModule {}
