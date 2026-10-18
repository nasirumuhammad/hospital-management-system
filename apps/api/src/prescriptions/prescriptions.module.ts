import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DoctorsModule } from '../doctors/doctors.module';
import { MedicalRecordsModule } from '../medical-records/medical-records.module';
import { PatientsModule } from '../patients/patients.module';
import { Prescription } from './entities/prescription.entity';
import { PrescriptionsController } from './prescriptions.controller';
import { PrescriptionsRepository } from './prescriptions.repository';
import { PrescriptionsService } from './prescriptions.service';

@Module({
  imports: [TypeOrmModule.forFeature([Prescription]), MedicalRecordsModule, PatientsModule, DoctorsModule],
  controllers: [PrescriptionsController],
  providers: [PrescriptionsRepository, PrescriptionsService],
})
export class PrescriptionsModule {}
