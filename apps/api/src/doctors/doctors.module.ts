import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DoctorsController } from './doctors.controller';
import { DoctorsRepository } from './doctors.repository';
import { DoctorsService } from './doctors.service';
import { Doctor } from './entities/doctor.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Doctor])],
  controllers: [DoctorsController],
  providers: [DoctorsRepository, DoctorsService],
  exports: [DoctorsService],
})
export class DoctorsModule {}
