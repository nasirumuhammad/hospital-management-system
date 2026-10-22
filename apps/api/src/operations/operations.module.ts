import { Module } from '@nestjs/common';
import { BilledOrdersService } from './billed-orders.service';
import { OperationsController } from './operations.controller';
import { OperationsService } from './operations.service';

@Module({ controllers: [OperationsController], providers: [OperationsService, BilledOrdersService] })
export class OperationsModule {}
