import { BadRequestException } from '@nestjs/common';
import { InvoiceStatus } from '../common/enums/invoice-status.enum';
import { fromMinorUnits, toMinorUnits } from '../common/utils/money.util';
import { applyPayment, assertCanVoid } from './invoice-ledger';

const invoice = (amount: string, amountPaid: string, status = InvoiceStatus.UNPAID) => ({ amount, amountPaid, status });

describe('money utilities', () => {
  it('converts without floating point drift', () => {
    expect(toMinorUnits('0.10') + toMinorUnits('0.20')).toBe(30);
    expect(fromMinorUnits(toMinorUnits('1234.5'))).toBe('1234.50');
    expect(fromMinorUnits(5)).toBe('0.05');
  });

  it('rejects malformed amounts', () => {
    expect(() => toMinorUnits('12.345')).toThrow(RangeError);
    expect(() => toMinorUnits('-1')).toThrow(RangeError);
  });
});

describe('applyPayment', () => {
  it('marks partial payments as partially paid', () => {
    expect(applyPayment(invoice('100.00', '0.00'), '40.25')).toEqual({ amountPaid: '40.25', status: InvoiceStatus.PARTIALLY_PAID });
  });

  it('marks a payment that clears the balance as paid', () => {
    expect(applyPayment(invoice('100.00', '40.25', InvoiceStatus.PARTIALLY_PAID), '59.75')).toEqual({
      amountPaid: '100.00',
      status: InvoiceStatus.PAID,
    });
  });

  it('rejects overpayment, payment on paid invoices and payment on void invoices', () => {
    expect(() => applyPayment(invoice('100.00', '90.00'), '10.01')).toThrow(BadRequestException);
    expect(() => applyPayment(invoice('100.00', '100.00', InvoiceStatus.PAID), '1.00')).toThrow(BadRequestException);
    expect(() => applyPayment(invoice('100.00', '0.00', InvoiceStatus.VOID), '1.00')).toThrow(BadRequestException);
  });
});

describe('assertCanVoid', () => {
  it('allows voiding an unpaid invoice only', () => {
    expect(() => assertCanVoid(invoice('50.00', '0.00'))).not.toThrow();
    expect(() => assertCanVoid(invoice('50.00', '10.00', InvoiceStatus.PARTIALLY_PAID))).toThrow(BadRequestException);
    expect(() => assertCanVoid(invoice('50.00', '0.00', InvoiceStatus.VOID))).toThrow(BadRequestException);
  });
});
