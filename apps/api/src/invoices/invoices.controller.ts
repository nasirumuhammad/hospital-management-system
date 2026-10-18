import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { ListInvoicesQueryDto } from './dto/list-invoices-query.dto';
import { RecordPaymentDto } from './dto/record-payment.dto';
import { InvoicesService } from './invoices.service';

@Controller('invoices')
@Roles(UserRole.ADMIN, UserRole.PATIENT)
export class InvoicesController {
  constructor(private readonly invoices: InvoicesService) {}

  @Get()
  list(@Query() query: ListInvoicesQueryDto, @CurrentUser() user: AuthenticatedUser) {
    return this.invoices.list(query, user);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.invoices.findOne(id, user);
  }

  @Post()
  @Roles(UserRole.ADMIN)
  create(@Body() dto: CreateInvoiceDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.invoices.create(dto, actor);
  }

  @Post(':id/payments')
  @Roles(UserRole.ADMIN)
  recordPayment(@Param('id', ParseUUIDPipe) id: string, @Body() dto: RecordPaymentDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.invoices.recordPayment(id, dto, actor);
  }

  @Post(':id/void')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.ADMIN)
  void(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.invoices.void(id, actor);
  }
}
