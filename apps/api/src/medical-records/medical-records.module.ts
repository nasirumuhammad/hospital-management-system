import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppointmentsModule } from '../appointments/appointments.module';
import { DoctorsModule } from '../doctors/doctors.module';
import { PatientsModule } from '../patients/patients.module';
import { MedicalRecord } from './entities/medical-record.entity';
import { MedicalRecordsController } from './medical-records.controller';
import { MedicalRecordsRepository } from './medical-records.repository';
import { MedicalRecordsService } from './medical-records.service';

@Module({
  imports: [TypeOrmModule.forFeature([MedicalRecord]), AppointmentsModule, PatientsModule, DoctorsModule],
  controllers: [MedicalRecordsController],
  providers: [MedicalRecordsRepository, MedicalRecordsService],
  exports: [MedicalRecordsService],
})
export class MedicalRecordsModule {}
