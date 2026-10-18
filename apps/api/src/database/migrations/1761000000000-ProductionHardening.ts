import { MigrationInterface, QueryRunner } from 'typeorm';

const TIMESTAMP_COLUMNS: Record<string, string[]> = {
  staff_users: ['createdAt', 'updatedAt'],
  patients: ['createdAt', 'updatedAt'],
  doctors: ['createdAt', 'updatedAt'],
  appointments: ['createdAt', 'updatedAt'],
  medical_records: ['createdAt', 'updatedAt'],
  invoices: ['createdAt', 'updatedAt'],
  prescriptions: ['createdAt'],
  audit_logs: ['createdAt'],
};

const REPLACED_FOREIGN_KEYS = [
  { table: 'appointments', name: 'FK_appointments_patient', column: 'patientId', target: 'patients' },
  { table: 'appointments', name: 'FK_appointments_doctor', column: 'doctorId', target: 'doctors' },
  { table: 'medical_records', name: 'FK_medical_records_patient', column: 'patientId', target: 'patients' },
  { table: 'prescriptions', name: 'FK_prescriptions_patient', column: 'patientId', target: 'patients' },
];

export class ProductionHardening1761000000000 implements MigrationInterface {
  name = 'ProductionHardening1761000000000';

  async up(q: QueryRunner): Promise<void> {
    await this.convertTimestamps(q, 'TIMESTAMPTZ', `AT TIME ZONE 'UTC'`);
    await this.extendUsers(q);
    await this.addSoftDeletes(q);
    await this.replaceForeignKeys(q, 'RESTRICT');
    await this.createIndexes(q);
    await this.createAuthTables(q);
    await this.createPayments(q);
  }

  async down(q: QueryRunner): Promise<void> {
    await q.query('DROP TABLE "payments"');
    await q.query('DROP TABLE "user_tokens"');
    await q.query('DROP TABLE "refresh_tokens"');
    await this.dropIndexes(q);
    await this.replaceForeignKeys(q, 'CASCADE');
    await this.removeSoftDeletes(q);
    await q.query('ALTER TABLE "staff_users" DROP COLUMN "emailVerifiedAt"');
    await q.query('ALTER TABLE "staff_users" DROP COLUMN "tokenVersion"');
    await q.query('ALTER TABLE "staff_users" ALTER COLUMN "passwordHash" TYPE character varying');
    await this.convertTimestamps(q, 'TIMESTAMP', `AT TIME ZONE 'UTC'`);
  }

  private async convertTimestamps(q: QueryRunner, type: string, zoneClause: string): Promise<void> {
    for (const [table, columns] of Object.entries(TIMESTAMP_COLUMNS)) {
      for (const column of columns) {
        await q.query(`ALTER TABLE "${table}" ALTER COLUMN "${column}" TYPE ${type} USING "${column}" ${zoneClause}`);
      }
    }
  }

  private async extendUsers(q: QueryRunner): Promise<void> {
    await q.query('ALTER TABLE "staff_users" ALTER COLUMN "passwordHash" TYPE character varying(100)');
    await q.query('ALTER TABLE "staff_users" ADD "tokenVersion" integer NOT NULL DEFAULT 0');
    await q.query('ALTER TABLE "staff_users" ADD "emailVerifiedAt" TIMESTAMPTZ');
    // Accounts created before email verification existed are treated as verified.
    await q.query('UPDATE "staff_users" SET "emailVerifiedAt" = now()');
  }

  private async addSoftDeletes(q: QueryRunner): Promise<void> {
    for (const table of ['patients', 'doctors', 'appointments']) {
      await q.query(`ALTER TABLE "${table}" ADD "deletedAt" TIMESTAMPTZ`);
    }
    for (const table of ['patients', 'doctors']) {
      await q.query(`ALTER TABLE "${table}" DROP CONSTRAINT "UQ_${table}_email"`);
      await q.query(`ALTER TABLE "${table}" DROP CONSTRAINT "UQ_${table}_userId"`);
      await q.query(`CREATE UNIQUE INDEX "UQ_${table}_email_active" ON "${table}" ("email") WHERE "deletedAt" IS NULL`);
      await q.query(`CREATE UNIQUE INDEX "UQ_${table}_userId_active" ON "${table}" ("userId") WHERE "deletedAt" IS NULL`);
    }
  }

  private async removeSoftDeletes(q: QueryRunner): Promise<void> {
    for (const table of ['patients', 'doctors']) {
      await q.query(`DROP INDEX "UQ_${table}_userId_active"`);
      await q.query(`DROP INDEX "UQ_${table}_email_active"`);
      await q.query(`ALTER TABLE "${table}" ADD CONSTRAINT "UQ_${table}_userId" UNIQUE ("userId")`);
      await q.query(`ALTER TABLE "${table}" ADD CONSTRAINT "UQ_${table}_email" UNIQUE ("email")`);
    }
    for (const table of ['patients', 'doctors', 'appointments']) {
      await q.query(`ALTER TABLE "${table}" DROP COLUMN "deletedAt"`);
    }
  }

  private async replaceForeignKeys(q: QueryRunner, onDelete: 'RESTRICT' | 'CASCADE'): Promise<void> {
    for (const { table, name, column, target } of REPLACED_FOREIGN_KEYS) {
      await q.query(`ALTER TABLE "${table}" DROP CONSTRAINT "${name}"`);
      await q.query(`ALTER TABLE "${table}" ADD CONSTRAINT "${name}" FOREIGN KEY ("${column}") REFERENCES "${target}"("id") ON DELETE ${onDelete}`);
    }
  }

  private async createIndexes(q: QueryRunner): Promise<void> {
    await q.query(`CREATE INDEX "IDX_appointments_doctor_scheduled" ON "appointments" ("doctorId", "scheduledAt")`);
    await q.query(`CREATE INDEX "IDX_appointments_patient" ON "appointments" ("patientId")`);
    await q.query(`CREATE INDEX "IDX_appointments_status" ON "appointments" ("status")`);
    await q.query(`CREATE UNIQUE INDEX "UQ_appointments_doctor_slot_open" ON "appointments" ("doctorId", "scheduledAt") WHERE "deletedAt" IS NULL AND "status" IN ('PENDING', 'CONFIRMED')`);
    await q.query(`CREATE INDEX "IDX_medical_records_patient" ON "medical_records" ("patientId")`);
    await q.query(`CREATE INDEX "IDX_medical_records_doctor" ON "medical_records" ("doctorId")`);
    await q.query(`CREATE INDEX "IDX_prescriptions_patient" ON "prescriptions" ("patientId")`);
    await q.query(`CREATE INDEX "IDX_prescriptions_doctor" ON "prescriptions" ("doctorId")`);
    await q.query(`CREATE INDEX "IDX_invoices_patient" ON "invoices" ("patientId")`);
    await q.query(`CREATE INDEX "IDX_invoices_status" ON "invoices" ("status")`);
    await q.query(`CREATE INDEX "IDX_audit_logs_created" ON "audit_logs" ("createdAt")`);
    await q.query(`CREATE INDEX "IDX_audit_logs_actor" ON "audit_logs" ("actorId")`);
    await q.query(`CREATE INDEX "IDX_audit_logs_target" ON "audit_logs" ("targetType", "targetId")`);
  }

  private async dropIndexes(q: QueryRunner): Promise<void> {
    const names = [
      'IDX_audit_logs_target', 'IDX_audit_logs_actor', 'IDX_audit_logs_created',
      'IDX_invoices_status', 'IDX_invoices_patient', 'IDX_prescriptions_doctor', 'IDX_prescriptions_patient',
      'IDX_medical_records_doctor', 'IDX_medical_records_patient', 'UQ_appointments_doctor_slot_open',
      'IDX_appointments_status', 'IDX_appointments_patient', 'IDX_appointments_doctor_scheduled',
    ];
    for (const name of names) await q.query(`DROP INDEX "${name}"`);
  }

  private async createAuthTables(q: QueryRunner): Promise<void> {
    await q.query(`CREATE TABLE "refresh_tokens" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "familyId" uuid NOT NULL, "tokenHash" character varying(64) NOT NULL, "tokenVersion" integer NOT NULL, "expiresAt" TIMESTAMPTZ NOT NULL, "revokedAt" TIMESTAMPTZ, "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(), CONSTRAINT "PK_refresh_tokens_id" PRIMARY KEY ("id"))`);
    await q.query(`CREATE UNIQUE INDEX "UQ_refresh_tokens_hash" ON "refresh_tokens" ("tokenHash")`);
    await q.query(`CREATE INDEX "IDX_refresh_tokens_user" ON "refresh_tokens" ("userId")`);
    await q.query(`CREATE INDEX "IDX_refresh_tokens_family" ON "refresh_tokens" ("familyId")`);
    await q.query(`ALTER TABLE "refresh_tokens" ADD CONSTRAINT "FK_refresh_tokens_user" FOREIGN KEY ("userId") REFERENCES "staff_users"("id") ON DELETE CASCADE`);
    await q.query(`CREATE TABLE "user_tokens" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "type" character varying(30) NOT NULL, "tokenHash" character varying(64) NOT NULL, "expiresAt" TIMESTAMPTZ NOT NULL, "usedAt" TIMESTAMPTZ, "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(), CONSTRAINT "PK_user_tokens_id" PRIMARY KEY ("id"))`);
    await q.query(`CREATE UNIQUE INDEX "UQ_user_tokens_hash" ON "user_tokens" ("tokenHash")`);
    await q.query(`CREATE INDEX "IDX_user_tokens_user_type" ON "user_tokens" ("userId", "type")`);
    await q.query(`ALTER TABLE "user_tokens" ADD CONSTRAINT "FK_user_tokens_user" FOREIGN KEY ("userId") REFERENCES "staff_users"("id") ON DELETE CASCADE`);
  }

  private async createPayments(q: QueryRunner): Promise<void> {
    await q.query(`CREATE TABLE "payments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "invoiceId" uuid NOT NULL, "amount" numeric(12,2) NOT NULL, "method" character varying(20) NOT NULL, "reference" character varying(100), "receivedById" uuid, "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(), CONSTRAINT "PK_payments_id" PRIMARY KEY ("id"))`);
    await q.query(`CREATE INDEX "IDX_payments_invoice" ON "payments" ("invoiceId")`);
    await q.query(`ALTER TABLE "payments" ADD CONSTRAINT "FK_payments_invoice" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE RESTRICT`);
    await q.query(`ALTER TABLE "payments" ADD CONSTRAINT "FK_payments_received_by" FOREIGN KEY ("receivedById") REFERENCES "staff_users"("id") ON DELETE SET NULL`);
  }
}
