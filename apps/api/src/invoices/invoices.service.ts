import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { AppointmentsRepository } from '../appointments/appointments.repository';
import { AuditAction } from '../common/enums/audit-action.enum';
import { AuditTarget } from '../common/enums/audit-target.enum';
import { InvoiceStatus } from '../common/enums/invoice-status.enum';
import { UserRole } from '../common/enums/user-role.enum';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { PaginatedResult } from '../common/interfaces/paginated-result.interface';
import { PatientsService } from '../patients/patients.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { ListInvoicesQueryDto } from './dto/list-invoices-query.dto';
import { RecordPaymentDto } from './dto/record-payment.dto';
import { Invoice } from './entities/invoice.entity';
import { Payment } from './entities/payment.entity';
import { applyPayment, assertCanVoid } from './invoice-ledger';
import { InvoiceScope, InvoicesRepository } from './invoices.repository';

const CURRENCY_DECIMALS = 2;

@Injectable()
export class InvoicesService {
  constructor(
    private readonly repository: InvoicesRepository,
    private readonly appointments: AppointmentsRepository,
    private readonly patients: PatientsService,
    private readonly audit: AuditService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  list(query: ListInvoicesQueryDto, user: AuthenticatedUser): Promise<PaginatedResult<Invoice>> {
    return this.repository.search(query, this.scopeFor(user));
  }

  countOutstanding(user: AuthenticatedUser): Promise<number> {
    return this.repository.countOutstanding(this.scopeFor(user));
  }

  async findOne(id: string, user: AuthenticatedUser): Promise<Invoice> {
    const invoice = await this.repository.findOneScoped(id, this.scopeFor(user));
    if (!invoice) throw new NotFoundException('Invoice not found');
    return invoice;
  }

  async create(dto: CreateInvoiceDto, actor: AuthenticatedUser): Promise<Invoice> {
    const patient = await this.patients.findOrFail(dto.patientId, actor);
    if (dto.appointmentId) await this.assertAppointmentBelongsTo(dto.appointmentId, patient.id, actor);
    if (dto.visitId) {
      const visits = await this.dataSource.query(`SELECT \"id\" FROM \"visits\" WHERE \"id\"=$1 AND \"hospitalId\"=$2 AND \"patientId\"=$3`, [dto.visitId,this.requireHospital(actor),patient.id]);
      if (!visits.length) throw new BadRequestException('Visit must belong to this patient and hospital');
    }
    const saved = await this.repository.save(
      this.repository.create({
        hospitalId: this.requireHospital(actor),
        patientId: patient.id,
        appointmentId: dto.appointmentId ?? null,
        visitId: dto.visitId ?? null,
        description: dto.description,
        amount: dto.amount.toFixed(CURRENCY_DECIMALS),
        amountPaid: '0.00',
        status: InvoiceStatus.UNPAID,
        dueDate: dto.dueDate ?? null,
      }),
    );
    await this.record(AuditAction.INVOICE_CREATED, AuditTarget.INVOICE, actor, saved.id);
    return this.findOne(saved.id, actor);
  }

  async recordPayment(id: string, dto: RecordPaymentDto, actor: AuthenticatedUser): Promise<Invoice> {
    const amount = dto.amount.toFixed(CURRENCY_DECIMALS);
    const payment = await this.repository.withLockedInvoice(id, this.requireHospital(actor), async (invoice, manager) => {
      await manager.update(Invoice, id, applyPayment(invoice, amount));
      return manager.save(manager.create(Payment, { hospitalId: this.requireHospital(actor), invoiceId: id, amount, method: dto.method, reference: dto.reference ?? null, receivedById: actor.id }));
    });
    await this.record(AuditAction.PAYMENT_RECORDED, AuditTarget.PAYMENT, actor, payment.id, { invoiceId: id });
    return this.findOne(id, actor);
  }

  async void(id: string, actor: AuthenticatedUser): Promise<Invoice> {
    await this.repository.withLockedInvoice(id, this.requireHospital(actor), async (invoice, manager) => {
      assertCanVoid(invoice);
      await manager.update(Invoice, id, { status: InvoiceStatus.VOID });
    });
    await this.record(AuditAction.INVOICE_VOIDED, AuditTarget.INVOICE, actor, id);
    return this.findOne(id, actor);
  }

  private async assertAppointmentBelongsTo(appointmentId: string, patientId: string, actor: AuthenticatedUser): Promise<void> {
    const appointment = await this.appointments.findOneScoped(appointmentId, { hospitalId: this.requireHospital(actor) });
    if (!appointment || appointment.patientId !== patientId) {
      throw new BadRequestException('Appointment must belong to this patient');
    }
  }

  private scopeFor(user: AuthenticatedUser): InvoiceScope {
    const hospitalId = this.requireHospital(user);
    return user.role === UserRole.PATIENT ? { hospitalId, patientUserId: user.id } : { hospitalId };
  }

  private requireHospital(user: AuthenticatedUser): string {
    if (!user.hospitalId) throw new NotFoundException('A hospital must be selected for this operation');
    return user.hospitalId;
  }

  private record(action: AuditAction, targetType: AuditTarget, actor: AuthenticatedUser, targetId: string, metadata?: Record<string, unknown>) {
    return this.audit.record({ hospitalId: this.requireHospital(actor), actorId: actor.id, action, targetType, targetId, metadata });
  }
}
