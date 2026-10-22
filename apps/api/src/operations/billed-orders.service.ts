import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { fromMinorUnits, toMinorUnits } from '../common/utils/money.util';

const INVOICE_DESCRIPTION_MAX = 180;
const QUEUE_LIMIT = 200;

interface InvoiceLine { description: string; quantity: number; unitPrice: string }

/**
 * The billing side of pharmacy and laboratory orders. Each step belongs to one role:
 * doctors order, the pharmacy/lab generates the invoice, the cashier records payment
 * (InvoicesService), and only then may medicine be dispensed or a specimen collected.
 */
@Injectable()
export class BilledOrdersService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  /** Prescriptions waiting on the pharmacy, with where each one is in the invoice → payment → dispense flow. */
  listPharmacyQueue(actor: AuthenticatedUser, status?: string) {
    const hospitalId = this.hospital(actor);
    return this.dataSource.query(
      `SELECT pr."id", pr."medication", pr."dosage", pr."frequency", pr."duration", pr."quantityPrescribed", pr."status", pr."invoiceId", pr."createdAt",
              p."firstName", p."lastName", p."hospitalNumber",
              d."id" AS "drugId", d."genericName", d."unitPrice", d."dispensingUnit",
              inv."status" AS "invoiceStatus", inv."amount" AS "invoiceAmount",
              COALESCE((SELECT SUM(x."quantity") FROM "dispensings" x WHERE x."prescriptionId"=pr."id" AND x."hospitalId"=pr."hospitalId"),0)::int AS "quantityDispensed"
         FROM "prescriptions" pr
         JOIN "patients" p ON p."id"=pr."patientId" AND p."hospitalId"=pr."hospitalId"
         LEFT JOIN "drugs" d ON d."id"=pr."drugId" AND d."hospitalId"=pr."hospitalId"
         LEFT JOIN "invoices" inv ON inv."id"=pr."invoiceId" AND inv."hospitalId"=pr."hospitalId"
        WHERE pr."hospitalId"=$1
          AND ($2::text IS NULL AND pr."status" NOT IN ('DISPENSED','CANCELLED') OR pr."status"=$2)
        ORDER BY pr."createdAt" ASC
        LIMIT ${QUEUE_LIMIT}`,
      [hospitalId, status ?? null],
    );
  }

  /** Pharmacy step: price the prescription from the drug catalogue and raise the invoice the patient pays at the cashier. */
  async invoicePrescription(prescriptionId: string, actor: AuthenticatedUser) {
    const hospitalId = this.hospital(actor);
    return this.dataSource.transaction(async (manager) => {
      const [prescription] = await manager.query(`SELECT * FROM "prescriptions" WHERE "id"=$1 AND "hospitalId"=$2 FOR UPDATE`, [prescriptionId, hospitalId]);
      if (!prescription) throw new NotFoundException('Prescription not found');
      if (prescription.status === 'CANCELLED') throw new ConflictException('This prescription was cancelled');
      if (prescription.status !== 'PENDING') throw new ConflictException('An invoice has already been generated for this prescription');
      if (!prescription.drugId || !prescription.quantityPrescribed) {
        throw new BadRequestException('This prescription is not linked to a catalogue drug and quantity, so it cannot be billed. Ask the doctor to prescribe from the catalogue.');
      }
      const [drug] = await manager.query(`SELECT * FROM "drugs" WHERE "id"=$1 AND "hospitalId"=$2 AND "isActive"=true`, [prescription.drugId, hospitalId]);
      if (!drug) throw new BadRequestException('The prescribed drug is no longer in the catalogue');
      if (drug.unitPrice === null) throw new BadRequestException(`Set a price for ${drug.genericName} before generating the invoice`);
      const [record] = prescription.medicalRecordId
        ? await manager.query(`SELECT "visitId" FROM "medical_records" WHERE "id"=$1 AND "hospitalId"=$2`, [prescription.medicalRecordId, hospitalId])
        : [];
      const label = [drug.genericName, drug.strength].filter(Boolean).join(' ');
      const invoice = await this.createInvoice(manager, {
        hospitalId, actorId: actor.id, patientId: prescription.patientId, visitId: record?.visitId ?? null,
        description: `Pharmacy: ${label}`,
        lines: [{ description: `${label} (${drug.dispensingUnit})`, quantity: prescription.quantityPrescribed, unitPrice: drug.unitPrice }],
      });
      await manager.query(`UPDATE "prescriptions" SET "status"='AWAITING_PAYMENT', "invoiceId"=$3 WHERE "id"=$1 AND "hospitalId"=$2`, [prescriptionId, hospitalId, invoice.id]);
      await this.writeAudit(manager, hospitalId, actor.id, 'PRESCRIPTION_INVOICED', 'prescription', prescriptionId, { invoiceId: invoice.id, amount: invoice.amount });
      return { prescriptionId, status: 'AWAITING_PAYMENT', invoice };
    });
  }

  /** Laboratory step: price the ordered tests from the test catalogue and raise the invoice the patient pays at the cashier. */
  async invoiceLabOrder(orderId: string, actor: AuthenticatedUser) {
    const hospitalId = this.hospital(actor);
    return this.dataSource.transaction(async (manager) => {
      const [order] = await manager.query(`SELECT * FROM "lab_orders" WHERE "id"=$1 AND "hospitalId"=$2 FOR UPDATE`, [orderId, hospitalId]);
      if (!order) throw new NotFoundException('Lab order not found');
      if (order.invoiceId) throw new ConflictException('An invoice has already been generated for this lab order');
      const tests = await manager.query(
        `SELECT i."testName", t."price" FROM "lab_order_items" i JOIN "lab_tests" t ON t."id"=i."labTestId" AND t."hospitalId"=i."hospitalId"
          WHERE i."labOrderId"=$1 AND i."hospitalId"=$2 AND i."status"<>'CANCELLED' ORDER BY i."createdAt"`,
        [orderId, hospitalId],
      );
      if (!tests.length) throw new BadRequestException('This order has no billable tests');
      const unpriced = tests.find((test: { price: string | null }) => test.price === null);
      if (unpriced) throw new BadRequestException(`Set a price for ${unpriced.testName} before generating the invoice`);
      const names = tests.map((test: { testName: string }) => test.testName).join(', ');
      const invoice = await this.createInvoice(manager, {
        hospitalId, actorId: actor.id, patientId: order.patientId, visitId: order.visitId,
        description: `Laboratory: ${names}`,
        lines: tests.map((test: { testName: string; price: string }) => ({ description: test.testName, quantity: 1, unitPrice: test.price })),
      });
      await manager.query(`UPDATE "lab_orders" SET "invoiceId"=$3, "updatedAt"=now() WHERE "id"=$1 AND "hospitalId"=$2`, [orderId, hospitalId, invoice.id]);
      await this.writeAudit(manager, hospitalId, actor.id, 'LAB_ORDER_INVOICED', 'lab_order', orderId, { invoiceId: invoice.id, amount: invoice.amount });
      return { labOrderId: orderId, invoice };
    });
  }

  async setDrugPrice(drugId: string, price: number, actor: AuthenticatedUser) {
    return this.setPrice('drugs', 'unitPrice', 'DRUG_PRICE_SET', 'drug', drugId, price, actor);
  }

  async setLabTestPrice(testId: string, price: number, actor: AuthenticatedUser) {
    return this.setPrice('lab_tests', 'price', 'LAB_TEST_PRICE_SET', 'lab_test', testId, price, actor);
  }

  /** Changing a catalogue price never alters invoices that were already generated. */
  private async setPrice(table: string, column: string, action: string, target: string, id: string, price: number, actor: AuthenticatedUser) {
    const hospitalId = this.hospital(actor);
    return this.dataSource.transaction(async (manager) => {
      const [row] = await manager.query(`UPDATE "${table}" SET "${column}"=$3, "updatedAt"=now() WHERE "id"=$1 AND "hospitalId"=$2 RETURNING *`, [id, hospitalId, price.toFixed(2)]);
      if (!row) throw new NotFoundException('Catalogue item not found');
      await this.writeAudit(manager, hospitalId, actor.id, action, target, id, { price: price.toFixed(2) });
      return row;
    });
  }

  private async createInvoice(manager: EntityManager, input: { hospitalId: string; actorId: string; patientId: string; visitId: string | null; description: string; lines: InvoiceLine[] }) {
    const priced = input.lines.map((line) => ({ ...line, lineMinor: toMinorUnits(line.unitPrice) * line.quantity }));
    const totalMinor = priced.reduce((sum, line) => sum + line.lineMinor, 0);
    if (totalMinor <= 0) throw new BadRequestException('The total is zero, so there is nothing to bill. Set a price first.');
    const [invoice] = await manager.query(
      `INSERT INTO "invoices" ("hospitalId","patientId","visitId","description","amount","amountPaid","status") VALUES ($1,$2,$3,$4,$5,'0.00','UNPAID') RETURNING *`,
      [input.hospitalId, input.patientId, input.visitId, input.description.slice(0, INVOICE_DESCRIPTION_MAX), fromMinorUnits(totalMinor)],
    );
    for (const line of priced) {
      await manager.query(
        `INSERT INTO "invoice_items" ("hospitalId","invoiceId","description","quantity","unitPrice","lineTotal") VALUES ($1,$2,$3,$4,$5,$6)`,
        [input.hospitalId, invoice.id, line.description.slice(0, INVOICE_DESCRIPTION_MAX), line.quantity, line.unitPrice, fromMinorUnits(line.lineMinor)],
      );
    }
    await this.writeAudit(manager, input.hospitalId, input.actorId, 'INVOICE_CREATED', 'invoice', invoice.id, { source: 'order', amount: invoice.amount });
    return invoice;
  }

  private async writeAudit(manager: EntityManager, hospitalId: string, actorId: string, action: string, targetType: string, targetId: string, metadata: Record<string, unknown> = {}): Promise<void> {
    await manager.query(`INSERT INTO "audit_logs" ("hospitalId","actorId","action","targetType","targetId","metadata") VALUES ($1,$2,$3,$4,$5,$6::jsonb)`, [hospitalId, actorId, action, targetType, targetId, JSON.stringify(metadata)]);
  }

  private hospital(actor: AuthenticatedUser): string {
    if (!actor.hospitalId) throw new NotFoundException('A hospital must be selected for this operation');
    return actor.hospitalId;
  }
}
