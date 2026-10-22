import { MigrationInterface, QueryRunner } from 'typeorm';

/** Connects prescriptions and lab orders to invoices so that each department does only its own step:
 * doctor orders → pharmacy/lab generates the invoice → cashier collects payment → pharmacy dispenses / lab collects.
 * Prices live on the drug and test catalogues and are copied onto the invoice when it is generated. */
export class PharmacyAndLabBilling1764000000000 implements MigrationInterface {
  name = 'PharmacyAndLabBilling1764000000000';

  async up(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE "drugs" ADD COLUMN "unitPrice" numeric(12,2) CHECK ("unitPrice" IS NULL OR "unitPrice" >= 0)`);
    await q.query(`ALTER TABLE "lab_tests" ADD COLUMN "price" numeric(12,2) CHECK ("price" IS NULL OR "price" >= 0)`);
    await q.query(`ALTER TABLE "prescriptions" ADD COLUMN "invoiceId" uuid REFERENCES "invoices"("id") ON DELETE SET NULL`);
    await q.query(`ALTER TABLE "lab_orders" ADD COLUMN "invoiceId" uuid REFERENCES "invoices"("id") ON DELETE SET NULL`);
    await q.query(`ALTER TABLE "prescriptions" DROP CONSTRAINT IF EXISTS "prescriptions_status_check"`);
    await q.query(`ALTER TABLE "prescriptions" ADD CONSTRAINT "CHK_prescriptions_status" CHECK ("status" IN ('PENDING','AWAITING_PAYMENT','PAID','PARTIAL','DISPENSED','CANCELLED'))`);
    await q.query(`CREATE INDEX "IDX_prescriptions_invoice" ON "prescriptions" ("invoiceId") WHERE "invoiceId" IS NOT NULL`);
    await q.query(`CREATE INDEX "IDX_lab_orders_invoice" ON "lab_orders" ("invoiceId") WHERE "invoiceId" IS NOT NULL`);
  }

  async down(q: QueryRunner): Promise<void> {
    await q.query(`UPDATE "prescriptions" SET "status"='PENDING' WHERE "status" IN ('AWAITING_PAYMENT','PAID')`);
    await q.query(`DROP INDEX IF EXISTS "IDX_lab_orders_invoice"`);
    await q.query(`DROP INDEX IF EXISTS "IDX_prescriptions_invoice"`);
    await q.query(`ALTER TABLE "prescriptions" DROP CONSTRAINT IF EXISTS "CHK_prescriptions_status"`);
    await q.query(`ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_status_check" CHECK ("status" IN ('PENDING','PARTIAL','DISPENSED','CANCELLED'))`);
    await q.query(`ALTER TABLE "lab_orders" DROP COLUMN "invoiceId"`);
    await q.query(`ALTER TABLE "prescriptions" DROP COLUMN "invoiceId"`);
    await q.query(`ALTER TABLE "lab_tests" DROP COLUMN "price"`);
    await q.query(`ALTER TABLE "drugs" DROP COLUMN "unitPrice"`);
  }
}
