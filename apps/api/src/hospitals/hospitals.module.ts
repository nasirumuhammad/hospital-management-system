import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from '../users/users.module';
import { Hospital } from './entities/hospital.entity';
import { HospitalsController } from './hospitals.controller';
import { HospitalsService } from './hospitals.service';

@Module({ imports: [TypeOrmModule.forFeature([Hospital]), UsersModule], controllers: [HospitalsController], providers: [HospitalsService] })
export class HospitalsModule {}
