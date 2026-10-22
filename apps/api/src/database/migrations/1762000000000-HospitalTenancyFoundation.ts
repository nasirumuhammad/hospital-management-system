import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Establishes the hospital tenancy schema while preserving existing records.
 * Existing rows are attached to one deterministic default hospital so their
 * primary keys and relationships remain unchanged.
 *
 * This is the schema/backfill stage only. Tenant-scoped repository queries and
 * request-derived hospital assignment must be deployed before enabling more
 * than one hospital in production.
 */
export class HospitalTenancyFoundation1762000000000 implements MigrationInterface {
  name = 'HospitalTenancyFoundation1762000000000';

  private readonly defaultHospitalId = '00000000-0000-4000-8000-000000000001';

  async up(q: QueryRunner): Promise<void> {
    await q.query(`
      CREATE TABLE "hospitals" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" varchar(150) NOT NULL,
        "slug" varchar(60) NOT NULL,
        "phone" varchar(30),
        "address" text,
        "isActive" boolean NOT NULL DEFAULT true,
        "patientNumberPrefix" varchar(10) NOT NULL DEFAULT 'CP',
        "patientNumberYear" smallint NOT NULL DEFAULT EXTRACT(YEAR FROM (now() AT TIME ZONE 'Africa/Lagos'))::smallint,
        "nextPatientNumber" integer NOT NULL DEFAULT 1,
        "lastVisitNumber" integer NOT NULL DEFAULT 0,
        "lastVisitDate" date,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_hospitals_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_hospitals_slug" UNIQUE ("slug")
      )
    `);

    await q.query(
      `INSERT INTO "hospitals" ("id", "name", "slug", "patientNumberPrefix") VALUES ($1, 'Default Hospital', 'default-hospital', 'CP')`,
      [this.defaultHospitalId],
    );

    // Add nullable first, backfill, then enforce NOT NULL on tenant-owned records.
    for (const table of ['patients', 'doctors', 'appointments', 'medical_records', 'prescriptions', 'invoices', 'payments', 'audit_logs']) {
      await q.query(`ALTER TABLE "${table}" ADD COLUMN "hospitalId" uuid`);
      await q.query(`UPDATE "${table}" SET "hospitalId" = $1 WHERE "hospitalId" IS NULL`, [this.defaultHospitalId]);
      await q.query(`ALTER TABLE "${table}" ALTER COLUMN "hospitalId" SET NOT NULL`);
      await q.query(`ALTER TABLE "${table}" ALTER COLUMN "hospitalId" SET DEFAULT '00000000-0000-4000-8000-000000000001'`);
      await q.query(`ALTER TABLE "${table}" ADD CONSTRAINT "FK_${table}_hospital" FOREIGN KEY ("hospitalId") REFERENCES "hospitals"("id") ON DELETE RESTRICT`);
      await q.query(`CREATE INDEX "IDX_${table}_hospitalId" ON "${table}" ("hospitalId")`);
    }

    // NULL is reserved for platform-level super-admins. Existing users stay in
    // the default hospital so their current access and ownership are preserved.
    await q.query(`ALTER TABLE "staff_users" ADD COLUMN "hospitalId" uuid`);
    await q.query(`UPDATE "staff_users" SET "hospitalId" = $1 WHERE "hospitalId" IS NULL`, [this.defaultHospitalId]);
    await q.query(`ALTER TABLE "staff_users" ALTER COLUMN "hospitalId" SET DEFAULT '00000000-0000-4000-8000-000000000001'`);
    await q.query(`ALTER TABLE "staff_users" ADD CONSTRAINT "FK_staff_users_hospital" FOREIGN KEY ("hospitalId") REFERENCES "hospitals"("id") ON DELETE RESTRICT`);
    await q.query(`CREATE INDEX "IDX_staff_users_hospitalId" ON "staff_users" ("hospitalId")`);

    await q.query(`ALTER TABLE "patients" ALTER COLUMN "email" DROP NOT NULL`);
    await q.query(`ALTER TABLE "patients" ADD COLUMN "hospitalNumber" varchar(30)`);
    await q.query(`ALTER TABLE "patients" ADD COLUMN "middleName" varchar(100)`);
    await q.query(`ALTER TABLE "patients" ADD COLUMN "nextOfKinName" varchar(150)`);
    await q.query(`ALTER TABLE "patients" ADD COLUMN "nextOfKinPhone" varchar(30)`);
    await q.query(`ALTER TABLE "patients" ADD COLUMN "nextOfKinRelationship" varchar(50)`);
    await q.query(`ALTER TABLE "patients" ADD COLUMN "allergiesReviewedAt" timestamptz`);

    // Preserve existing patient rows and IDs; assign deterministic sequential
    // hospital numbers to the existing data in creation order.
    await q.query(`
      WITH numbered AS (
        SELECT "id", row_number() OVER (ORDER BY "createdAt", "id") AS n
        FROM "patients"
      )
      UPDATE "patients" p
      SET "hospitalNumber" = 'CP/' || EXTRACT(YEAR FROM (p."createdAt" AT TIME ZONE 'Africa/Lagos'))::int::text || '/' || lpad(numbered.n::text, 5, '0')
      FROM numbered
      WHERE p."id" = numbered."id"
    `);
    await q.query(`ALTER TABLE "patients" ALTER COLUMN "hospitalNumber" SET NOT NULL`);
    // Number new patients atomically in the database. The hospital row lock
    // serializes concurrent registrations and the counter rolls over by Nigeria year.
    await q.query(`
      CREATE OR REPLACE FUNCTION assign_hospital_patient_number() RETURNS trigger AS $$
      DECLARE
        current_year smallint := EXTRACT(YEAR FROM (now() AT TIME ZONE 'Africa/Lagos'))::smallint;
        current_prefix varchar(10);
        next_number integer;
      BEGIN
        IF NEW."hospitalNumber" IS NOT NULL AND NEW."hospitalNumber" <> '' THEN
          RETURN NEW;
        END IF;
        SELECT "patientNumberPrefix",
               CASE WHEN "patientNumberYear" = current_year THEN "nextPatientNumber" ELSE 1 END
          INTO current_prefix, next_number
          FROM "hospitals"
         WHERE "id" = NEW."hospitalId"
         FOR UPDATE;
        IF current_prefix IS NULL THEN
          RAISE EXCEPTION 'Hospital % does not exist', NEW."hospitalId";
        END IF;
        UPDATE "hospitals"
           SET "patientNumberYear" = current_year,
               "nextPatientNumber" = next_number + 1,
               "updatedAt" = now()
         WHERE "id" = NEW."hospitalId";
        NEW."hospitalNumber" := current_prefix || '/' || current_year::text || '/' || lpad(next_number::text, 5, '0');
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);
    await q.query(`CREATE TRIGGER "TRG_patients_assign_hospital_number" BEFORE INSERT ON "patients" FOR EACH ROW EXECUTE FUNCTION assign_hospital_patient_number()`);
    await q.query(`ALTER TABLE "patients" DROP CONSTRAINT IF EXISTS "UQ_patients_email_active"`);
    await q.query(`DROP INDEX IF EXISTS "UQ_patients_email_active"`);
    await q.query(`CREATE UNIQUE INDEX "UQ_patients_hospital_number" ON "patients" ("hospitalId", "hospitalNumber")`);
    await q.query(`CREATE UNIQUE INDEX "UQ_patients_email_active" ON "patients" ("hospitalId", "email") WHERE "email" IS NOT NULL AND "deletedAt" IS NULL`);

    await q.query(`UPDATE "hospitals" SET "nextPatientNumber" = (SELECT count(*) + 1 FROM "patients" WHERE "hospitalId" = $1), "patientNumberYear" = EXTRACT(YEAR FROM (now() AT TIME ZONE 'Africa/Lagos'))::smallint WHERE "id" = $1`, [this.defaultHospitalId]);
  }

  async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TRIGGER IF EXISTS "TRG_patients_assign_hospital_number" ON "patients"`);
    await q.query(`DROP FUNCTION IF EXISTS assign_hospital_patient_number()`);
    await q.query(`DROP INDEX IF EXISTS "UQ_patients_email_active"`);
    await q.query(`DROP INDEX IF EXISTS "UQ_patients_hospital_number"`);
    await q.query(`ALTER TABLE "patients" DROP COLUMN IF EXISTS "allergiesReviewedAt"`);
    await q.query(`ALTER TABLE "patients" DROP COLUMN IF EXISTS "nextOfKinRelationship"`);
    await q.query(`ALTER TABLE "patients" DROP COLUMN IF EXISTS "nextOfKinPhone"`);
    await q.query(`ALTER TABLE "patients" DROP COLUMN IF EXISTS "nextOfKinName"`);
    await q.query(`ALTER TABLE "patients" DROP COLUMN IF EXISTS "middleName"`);
    await q.query(`ALTER TABLE "patients" DROP COLUMN IF EXISTS "hospitalNumber"`);
    for (const table of ['staff_users', 'patients', 'doctors', 'appointments', 'medical_records', 'prescriptions', 'invoices', 'payments', 'audit_logs']) {
      await q.query(`DROP INDEX IF EXISTS "IDX_${table}_hospitalId"`);
      await q.query(`ALTER TABLE "${table}" DROP CONSTRAINT IF EXISTS "FK_${table}_hospital"`);
      await q.query(`ALTER TABLE "${table}" DROP COLUMN IF EXISTS "hospitalId"`);
    }
    await q.query(`DROP TABLE "hospitals"`);
  }
}
