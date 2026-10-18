import { BadRequestException } from '@nestjs/common';
import { InvoiceStatus } from '../common/enums/invoice-status.enum';
import { fromMinorUnits, toMinorUnits } from '../common/utils/money.util';

export interface LedgerInvoice {
  amount: string;
  amountPaid: string;
  status: InvoiceStatus;
}

export interface LedgerUpdate {
  amountPaid: string;
  status: InvoiceStatus;
}

export function applyPayment(invoice: LedgerInvoice, paymentAmount: string): LedgerUpdate {
  if (invoice.status === InvoiceStatus.VOID) throw new BadRequestException('A void invoice cannot receive payments');
  const total = toMinorUnits(invoice.amount);
  const outstanding = total - toMinorUnits(invoice.amountPaid);
  const payment = toMinorUnits(paymentAmount);
  if (outstanding === 0) throw new BadRequestException('This invoice is already fully paid');
  if (payment > outstanding) throw new BadRequestException(`Payment exceeds the outstanding balance of ${fromMinorUnits(outstanding)}`);
  const paid = total - outstanding + payment;
  return {
    amountPaid: fromMinorUnits(paid),
    status: paid === total ? InvoiceStatus.PAID : InvoiceStatus.PARTIALLY_PAID,
  };
}

export function assertCanVoid(invoice: LedgerInvoice): void {
  if (invoice.status === InvoiceStatus.VOID) throw new BadRequestException('Invoice is already void');
  if (toMinorUnits(invoice.amountPaid) > 0) throw new BadRequestException('An invoice with recorded payments cannot be voided');
}
