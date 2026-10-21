import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository, SelectQueryBuilder } from 'typeorm';
import { InvoiceStatus } from '../common/enums/invoice-status.enum';
import { PaginatedResult } from '../common/interfaces/paginated-result.interface';
import { toContainsPattern } from '../common/utils/escape-like.util';
import { paginate } from '../common/utils/pagination.util';
import { applySort, SortMap } from '../common/utils/sort.util';
import { ListInvoicesQueryDto } from './dto/list-invoices-query.dto';
import { Invoice } from './entities/invoice.entity';

export interface InvoiceScope {
  hospitalId: string;
  patientUserId?: string;
}

const PATIENT_COLUMNS = ['patient.id', 'patient.firstName', 'patient.lastName'];
const OUTSTANDING_STATUSES = [InvoiceStatus.UNPAID, InvoiceStatus.PARTIALLY_PAID];

const SORTABLE: SortMap = {
  patient: ['patient.lastName', 'patient.firstName'],
  description: 'i.description',
  amount: 'i.amount',
  amountPaid: 'i.amountPaid',
  dueDate: 'i.dueDate',
  status: 'i.status',
  createdAt: 'i.createdAt',
};

@Injectable()
export class InvoicesRepository {
  constructor(
    @InjectRepository(Invoice) private readonly repository: Repository<Invoice>,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  create(data: Partial<Invoice>): Invoice {
    return this.repository.create(data);
  }

  save(invoice: Invoice): Promise<Invoice> {
    return this.repository.save(invoice);
  }

  async update(id: string, hospitalId: string, changes: Partial<Invoice>): Promise<void> {
    await this.repository.update({ id, hospitalId }, changes);
  }

  findPlainById(id: string, hospitalId: string): Promise<Invoice | null> {
    return this.repository.findOneBy({ id, hospitalId });
  }

  findOneScoped(id: string, scope: InvoiceScope): Promise<Invoice | null> {
    return this.scoped(scope)
      .leftJoinAndSelect('i.payments', 'payment')
      .andWhere('i.id = :id', { id })
      .orderBy('payment.createdAt', 'ASC')
      .getOne();
  }

  search(query: ListInvoicesQueryDto, scope: InvoiceScope): Promise<PaginatedResult<Invoice>> {
    const builder = this.scoped(scope);
    if (query.patientId) builder.andWhere('i.patientId = :patientId', { patientId: query.patientId });
    if (query.status) builder.andWhere('i.status = :status', { status: query.status });
    if (query.q) {
      builder.andWhere(`(patient."firstName" || ' ' || patient."lastName" ILIKE :pattern OR i.description ILIKE :pattern)`, {
        pattern: toContainsPattern(query.q),
      });
    }
    applySort(builder, query, SORTABLE, { sortBy: 'createdAt', order: 'desc' }, 'i.id');
    return paginate(builder, query);
  }

  countOutstanding(scope: InvoiceScope): Promise<number> {
    return this.scoped(scope).andWhere('i.status IN (:...statuses)', { statuses: OUTSTANDING_STATUSES }).getCount();
  }

  withLockedInvoice<T>(id: string, hospitalId: string, work: (invoice: Invoice, manager: EntityManager) => Promise<T>): Promise<T> {
    return this.dataSource.transaction(async (manager) => {
      const invoice = await manager
        .getRepository(Invoice)
        .createQueryBuilder('i')
        .setLock('pessimistic_write')
        .where('i.id = :id AND i."hospitalId" = :hospitalId', { id, hospitalId })
        .getOne();
      if (!invoice) throw new NotFoundException('Invoice not found');
      return work(invoice, manager);
    });
  }

  private scoped(scope: InvoiceScope): SelectQueryBuilder<Invoice> {
    const builder = this.repository.createQueryBuilder('i').withDeleted().leftJoin('i.patient', 'patient').addSelect(PATIENT_COLUMNS).andWhere('i.hospitalId = :hospitalId', { hospitalId: scope.hospitalId });
    if (scope.patientUserId) builder.andWhere('patient.userId = :patientUserId', { patientUserId: scope.patientUserId });
    return builder;
  }
}
