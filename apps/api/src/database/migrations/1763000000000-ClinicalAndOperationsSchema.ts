import { MigrationInterface, QueryRunner } from 'typeorm';

/** Adds the operational schema for outpatient care, laboratory, pharmacy, billing,
 * inpatient care, maternity, stock control and HMO workflows. Existing records are
 * not rewritten or assigned new IDs by this migration. */
export class ClinicalAndOperationsSchema1763000000000 implements MigrationInterface {
  name = 'ClinicalAndOperationsSchema1763000000000';

  async up(q: QueryRunner): Promise<void> {
    await q.query(`CREATE TABLE "platform_audit_logs" ("id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(), "actorId" uuid, "action" varchar(100) NOT NULL, "targetType" varchar(80) NOT NULL, "targetId" varchar(100), "metadata" jsonb, "createdAt" timestamptz NOT NULL DEFAULT now())`);
    await q.query(`CREATE INDEX "IDX_platform_audit_created" ON "platform_audit_logs" ("createdAt" DESC)`);
    await q.query(`CREATE INDEX "IDX_platform_audit_actor" ON "platform_audit_logs" ("actorId")`);
    // Correct legacy global uniqueness now that patient/doctor identity is tenant-scoped.
    await q.query(`ALTER TABLE "patients" DROP CONSTRAINT IF EXISTS "UQ_patients_email"`);
    await q.query(`ALTER TABLE "doctors" DROP CONSTRAINT IF EXISTS "UQ_doctors_email"`);
    await q.query(`DROP INDEX IF EXISTS "UQ_doctors_email_active"`);
    await q.query(`CREATE UNIQUE INDEX IF NOT EXISTS "UQ_doctors_hospital_email" ON "doctors" ("hospitalId", "email") WHERE "deletedAt" IS NULL`);
    // Keep old rows valid while making phone required. Sentinel values must be reviewed by staff.
    await q.query(`UPDATE "patients" SET "phone" = 'NOT-PROVIDED-' || left("id"::text, 8) WHERE "phone" IS NULL OR btrim("phone") = ''`);
    await q.query(`ALTER TABLE "patients" ALTER COLUMN "phone" SET NOT NULL`);
    await q.query(`UPDATE "patients" SET "gender" = upper("gender") WHERE "gender" IS NOT NULL`);
    await q.query(`UPDATE "patients" SET "gender" = NULL WHERE "gender" NOT IN ('MALE', 'FEMALE')`);
    await q.query(`ALTER TABLE "patients" ADD CONSTRAINT "CHK_patients_gender" CHECK ("gender" IS NULL OR "gender" IN ('MALE','FEMALE'))`);

    await q.query(`ALTER TABLE "medical_records" ADD COLUMN "visitId" uuid`);
    await q.query(`CREATE UNIQUE INDEX "UQ_medical_records_visit" ON "medical_records" ("hospitalId","visitId") WHERE "visitId" IS NOT NULL`);
    await q.query(`ALTER TABLE "invoices" ADD COLUMN "visitId" uuid`);
    await q.query(`CREATE INDEX "IDX_invoices_visit" ON "invoices" ("hospitalId","visitId") WHERE "visitId" IS NOT NULL`);

    await q.query(`CREATE TABLE "payers" (
      "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(), "hospitalId" uuid NOT NULL REFERENCES "hospitals"("id") ON DELETE RESTRICT,
      "name" varchar(120) NOT NULL, "type" varchar(20) NOT NULL CHECK ("type" IN ('HMO','NHIA','CORPORATE')),
      "isActive" boolean NOT NULL DEFAULT true, "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "UQ_payers_hospital_name" UNIQUE ("hospitalId", "name"))`);
    await q.query(`CREATE TABLE "patient_coverages" (
      "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(), "hospitalId" uuid NOT NULL REFERENCES "hospitals"("id") ON DELETE RESTRICT,
      "patientId" uuid NOT NULL REFERENCES "patients"("id") ON DELETE RESTRICT, "payerId" uuid NOT NULL REFERENCES "payers"("id") ON DELETE RESTRICT,
      "enrolleeNumber" varchar(50) NOT NULL, "planName" varchar(80), "principalName" varchar(150), "expiresAt" date,
      "isActive" boolean NOT NULL DEFAULT true, "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "UQ_patient_coverages_patient_payer" UNIQUE ("patientId", "payerId"))`);

    await q.query(`CREATE TABLE "visits" (
      "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(), "hospitalId" uuid NOT NULL REFERENCES "hospitals"("id") ON DELETE RESTRICT,
      "patientId" uuid NOT NULL REFERENCES "patients"("id") ON DELETE RESTRICT, "visitNumber" integer NOT NULL,
      "visitDate" date NOT NULL, "source" varchar(20) NOT NULL CHECK ("source" IN ('WALK_IN','APPOINTMENT','REFERRAL','EMERGENCY')),
      "appointmentId" uuid REFERENCES "appointments"("id") ON DELETE SET NULL, "payerId" uuid REFERENCES "payers"("id") ON DELETE SET NULL,
      "doctorId" uuid REFERENCES "doctors"("id") ON DELETE SET NULL,
      "status" varchar(24) NOT NULL DEFAULT 'WAITING' CHECK ("status" IN ('WAITING','IN_TRIAGE','WITH_DOCTOR','AWAITING_SERVICES','COMPLETED','CANCELLED')),
      "priority" varchar(10) NOT NULL DEFAULT 'NORMAL' CHECK ("priority" IN ('NORMAL','URGENT')),
      "registeredById" uuid NOT NULL REFERENCES "staff_users"("id") ON DELETE RESTRICT,
      "arrivedAt" timestamptz NOT NULL DEFAULT now(), "closedAt" timestamptz,
      "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "UQ_visits_queue_number" UNIQUE ("hospitalId", "visitDate", "visitNumber"))`);
    await q.query(`CREATE UNIQUE INDEX "UQ_visits_appointment" ON "visits" ("hospitalId","appointmentId") WHERE "appointmentId" IS NOT NULL`);
    await q.query(`CREATE INDEX "IDX_visits_queue" ON "visits" ("hospitalId", "visitDate", "status", "priority", "visitNumber")`);
    await q.query(`CREATE INDEX "IDX_visits_patient" ON "visits" ("hospitalId", "patientId", "arrivedAt" DESC)`);

    await q.query(`CREATE TABLE "visit_authorizations" (
      "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(), "hospitalId" uuid NOT NULL REFERENCES "hospitals"("id") ON DELETE RESTRICT,
      "visitId" uuid NOT NULL REFERENCES "visits"("id") ON DELETE RESTRICT, "payerId" uuid NOT NULL REFERENCES "payers"("id") ON DELETE RESTRICT,
      "code" varchar(60), "scope" varchar(120) NOT NULL, "status" varchar(20) NOT NULL DEFAULT 'REQUESTED' CHECK ("status" IN ('REQUESTED','APPROVED','DENIED','EXPIRED')),
      "requestedAt" timestamptz NOT NULL DEFAULT now(), "respondedAt" timestamptz,
      "requestedById" uuid NOT NULL REFERENCES "staff_users"("id") ON DELETE RESTRICT, "note" text,
      "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now())`);

    await q.query(`CREATE TABLE "triage_records" (
      "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(), "hospitalId" uuid NOT NULL REFERENCES "hospitals"("id") ON DELETE RESTRICT,
      "visitId" uuid NOT NULL UNIQUE REFERENCES "visits"("id") ON DELETE RESTRICT,
      "recordedById" uuid NOT NULL REFERENCES "staff_users"("id") ON DELETE RESTRICT, "recordedAt" timestamptz NOT NULL DEFAULT now(),
      "chiefComplaint" text NOT NULL, "temperatureC" numeric(4,1), "pulseBpm" smallint, "respiratoryRate" smallint,
      "systolicBp" smallint, "diastolicBp" smallint, "spo2" smallint, "weightKg" numeric(5,1), "heightCm" numeric(5,1), "notes" text,
      "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "CHK_triage_spo2" CHECK ("spo2" IS NULL OR "spo2" BETWEEN 0 AND 100),
      CONSTRAINT "CHK_triage_positive_vitals" CHECK (("pulseBpm" IS NULL OR "pulseBpm" > 0) AND ("respiratoryRate" IS NULL OR "respiratoryRate" > 0) AND ("weightKg" IS NULL OR "weightKg" > 0) AND ("heightCm" IS NULL OR "heightCm" > 0)))`);

    await q.query(`CREATE TABLE "icd10_codes" ("code" varchar(10) PRIMARY KEY, "description" varchar(200) NOT NULL, "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now())`);
    await q.query(`CREATE TABLE "consultation_diagnoses" (
      "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(), "hospitalId" uuid NOT NULL REFERENCES "hospitals"("id") ON DELETE RESTRICT,
      "medicalRecordId" uuid NOT NULL REFERENCES "medical_records"("id") ON DELETE RESTRICT,
      "icd10Code" varchar(10) REFERENCES "icd10_codes"("code") ON DELETE SET NULL, "description" varchar(200) NOT NULL,
      "type" varchar(10) NOT NULL CHECK ("type" IN ('PRIMARY','SECONDARY')), "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now())`);
    await q.query(`CREATE UNIQUE INDEX "UQ_consultation_primary_diagnosis" ON "consultation_diagnoses" ("medicalRecordId") WHERE "type" = 'PRIMARY'`);
    await q.query(`CREATE TABLE "patient_allergies" (
      "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(), "hospitalId" uuid NOT NULL REFERENCES "hospitals"("id") ON DELETE RESTRICT,
      "patientId" uuid NOT NULL REFERENCES "patients"("id") ON DELETE RESTRICT, "allergen" varchar(120) NOT NULL, "reaction" varchar(200),
      "severity" varchar(10) CHECK ("severity" IS NULL OR "severity" IN ('MILD','MODERATE','SEVERE')),
      "isActive" boolean NOT NULL DEFAULT true, "recordedById" uuid NOT NULL REFERENCES "staff_users"("id") ON DELETE RESTRICT,
      "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now())`);

    await q.query(`CREATE TABLE "lab_tests" (
      "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(), "hospitalId" uuid NOT NULL REFERENCES "hospitals"("id") ON DELETE RESTRICT,
      "code" varchar(20) NOT NULL, "name" varchar(120) NOT NULL, "category" varchar(60) NOT NULL, "specimen" varchar(40), "isActive" boolean NOT NULL DEFAULT true,
      "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(), CONSTRAINT "UQ_lab_tests_code" UNIQUE ("hospitalId","code"))`);
    await q.query(`CREATE TABLE "lab_test_parameters" (
      "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(), "hospitalId" uuid NOT NULL REFERENCES "hospitals"("id") ON DELETE RESTRICT,
      "labTestId" uuid NOT NULL REFERENCES "lab_tests"("id") ON DELETE RESTRICT, "name" varchar(80) NOT NULL, "unit" varchar(20), "sortOrder" smallint NOT NULL DEFAULT 0,
      "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(), CONSTRAINT "UQ_lab_parameter_name" UNIQUE ("labTestId","name"))`);
    await q.query(`CREATE TABLE "lab_parameter_ranges" (
      "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(), "hospitalId" uuid NOT NULL REFERENCES "hospitals"("id") ON DELETE RESTRICT,
      "parameterId" uuid NOT NULL REFERENCES "lab_test_parameters"("id") ON DELETE RESTRICT, "sex" varchar(10) CHECK ("sex" IS NULL OR "sex" IN ('MALE','FEMALE')),
      "minAgeYears" numeric(5,1), "maxAgeYears" numeric(5,1), "refLow" numeric(10,2), "refHigh" numeric(10,2),
      "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "CHK_lab_range_age" CHECK ("minAgeYears" IS NULL OR "maxAgeYears" IS NULL OR "minAgeYears" <= "maxAgeYears"))`);
    await q.query(`CREATE TABLE "lab_orders" (
      "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(), "hospitalId" uuid NOT NULL REFERENCES "hospitals"("id") ON DELETE RESTRICT,
      "visitId" uuid NOT NULL REFERENCES "visits"("id") ON DELETE RESTRICT, "patientId" uuid NOT NULL REFERENCES "patients"("id") ON DELETE RESTRICT,
      "medicalRecordId" uuid REFERENCES "medical_records"("id") ON DELETE SET NULL, "orderedById" uuid NOT NULL REFERENCES "staff_users"("id") ON DELETE RESTRICT,
      "clinicalNote" text, "orderedAt" timestamptz NOT NULL DEFAULT now(), "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now())`);
    await q.query(`CREATE TABLE "lab_order_items" (
      "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(), "hospitalId" uuid NOT NULL REFERENCES "hospitals"("id") ON DELETE RESTRICT,
      "labOrderId" uuid NOT NULL REFERENCES "lab_orders"("id") ON DELETE RESTRICT, "labTestId" uuid NOT NULL REFERENCES "lab_tests"("id") ON DELETE RESTRICT,
      "testName" varchar(120) NOT NULL, "status" varchar(20) NOT NULL DEFAULT 'ORDERED' CHECK ("status" IN ('ORDERED','COLLECTED','RESULTED','CANCELLED')),
      "collectedAt" timestamptz, "collectedById" uuid REFERENCES "staff_users"("id") ON DELETE SET NULL,
      "resultedAt" timestamptz, "resultedById" uuid REFERENCES "staff_users"("id") ON DELETE SET NULL,
      "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now())`);
    await q.query(`CREATE TABLE "lab_results" (
      "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(), "hospitalId" uuid NOT NULL REFERENCES "hospitals"("id") ON DELETE RESTRICT,
      "orderItemId" uuid NOT NULL REFERENCES "lab_order_items"("id") ON DELETE RESTRICT, "parameterName" varchar(80) NOT NULL,
      "value" varchar(60) NOT NULL, "unit" varchar(20), "refLow" numeric(10,2), "refHigh" numeric(10,2),
      "flag" varchar(10) CHECK ("flag" IS NULL OR "flag" IN ('NORMAL','LOW','HIGH')),
      "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now())`);

    await q.query(`CREATE TABLE "drugs" (
      "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(), "hospitalId" uuid NOT NULL REFERENCES "hospitals"("id") ON DELETE RESTRICT,
      "genericName" varchar(120) NOT NULL, "brandName" varchar(120), "form" varchar(20) NOT NULL CHECK ("form" IN ('TABLET','CAPSULE','SYRUP','INJECTION','CREAM','OTHER')),
      "strength" varchar(40), "dispensingUnit" varchar(20) NOT NULL, "reorderLevel" integer NOT NULL DEFAULT 0 CHECK ("reorderLevel" >= 0),
      "isActive" boolean NOT NULL DEFAULT true, "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now())`);
    await q.query(`CREATE TABLE "drug_batches" (
      "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(), "hospitalId" uuid NOT NULL REFERENCES "hospitals"("id") ON DELETE RESTRICT,
      "drugId" uuid NOT NULL REFERENCES "drugs"("id") ON DELETE RESTRICT, "batchNumber" varchar(50) NOT NULL, "expiryDate" date NOT NULL,
      "quantityReceived" integer NOT NULL CHECK ("quantityReceived" >= 0), "quantityOnHand" integer NOT NULL CHECK ("quantityOnHand" >= 0),
      "supplier" varchar(150), "receivedAt" timestamptz NOT NULL DEFAULT now(), "receivedById" uuid NOT NULL REFERENCES "staff_users"("id") ON DELETE RESTRICT,
      "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(), CONSTRAINT "UQ_drug_batch" UNIQUE ("drugId","batchNumber"))`);
    await q.query(`CREATE INDEX "IDX_drug_batches_fefo" ON "drug_batches" ("hospitalId","drugId","expiryDate") WHERE "quantityOnHand" > 0`);
    await q.query(`CREATE TABLE "dispensings" (
      "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(), "hospitalId" uuid NOT NULL REFERENCES "hospitals"("id") ON DELETE RESTRICT,
      "prescriptionId" uuid REFERENCES "prescriptions"("id") ON DELETE RESTRICT, "drugBatchId" uuid NOT NULL REFERENCES "drug_batches"("id") ON DELETE RESTRICT,
      "quantity" integer NOT NULL CHECK ("quantity" > 0), "customerName" varchar(120), "dispensedById" uuid NOT NULL REFERENCES "staff_users"("id") ON DELETE RESTRICT,
      "dispensedAt" timestamptz NOT NULL DEFAULT now(), "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now())`);
    await q.query(`ALTER TABLE "prescriptions" ADD COLUMN "drugId" uuid REFERENCES "drugs"("id") ON DELETE SET NULL`);
    await q.query(`ALTER TABLE "prescriptions" ADD COLUMN "quantityPrescribed" integer CHECK ("quantityPrescribed" IS NULL OR "quantityPrescribed" > 0)`);
    await q.query(`ALTER TABLE "prescriptions" ADD COLUMN "status" varchar(20) NOT NULL DEFAULT 'PENDING' CHECK ("status" IN ('PENDING','PARTIAL','DISPENSED','CANCELLED'))`);

    // Billing primitives: immutable price snapshots and payer-specific service pricing.
    await q.query(`CREATE TABLE "service_catalog" (
      "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(), "hospitalId" uuid NOT NULL REFERENCES "hospitals"("id") ON DELETE RESTRICT,
      "code" varchar(30) NOT NULL, "name" varchar(120) NOT NULL, "category" varchar(40) NOT NULL,
      "isActive" boolean NOT NULL DEFAULT true, "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "UQ_service_catalog_code" UNIQUE ("hospitalId","code"))`);
    await q.query(`CREATE TABLE "service_prices" (
      "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(), "hospitalId" uuid NOT NULL REFERENCES "hospitals"("id") ON DELETE RESTRICT,
      "serviceId" uuid NOT NULL REFERENCES "service_catalog"("id") ON DELETE RESTRICT, "payerId" uuid REFERENCES "payers"("id") ON DELETE RESTRICT,
      "amount" numeric(12,2) NOT NULL CHECK ("amount" >= 0), "currency" varchar(3) NOT NULL DEFAULT 'NGN', "effectiveFrom" date NOT NULL DEFAULT CURRENT_DATE,
      "effectiveTo" date, "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "CHK_service_price_dates" CHECK ("effectiveTo" IS NULL OR "effectiveTo" >= "effectiveFrom"))`);
    await q.query(`CREATE TABLE "invoice_items" (
      "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(), "hospitalId" uuid NOT NULL REFERENCES "hospitals"("id") ON DELETE RESTRICT,
      "invoiceId" uuid NOT NULL REFERENCES "invoices"("id") ON DELETE RESTRICT, "serviceId" uuid REFERENCES "service_catalog"("id") ON DELETE SET NULL,
      "description" varchar(180) NOT NULL, "quantity" integer NOT NULL CHECK ("quantity" > 0), "unitPrice" numeric(12,2) NOT NULL CHECK ("unitPrice" >= 0),
      "lineTotal" numeric(12,2) NOT NULL CHECK ("lineTotal" >= 0), "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now())`);
    await q.query(`CREATE TABLE "cashier_shifts" (
      "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(), "hospitalId" uuid NOT NULL REFERENCES "hospitals"("id") ON DELETE RESTRICT,
      "cashierId" uuid NOT NULL REFERENCES "staff_users"("id") ON DELETE RESTRICT, "openedAt" timestamptz NOT NULL DEFAULT now(), "openingFloat" numeric(12,2) NOT NULL DEFAULT 0 CHECK ("openingFloat" >= 0),
      "closedAt" timestamptz, "expectedCash" numeric(12,2), "countedCash" numeric(12,2), "variance" numeric(12,2), "notes" text,
      "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "CHK_cashier_shift_close" CHECK (("closedAt" IS NULL AND "countedCash" IS NULL) OR ("closedAt" IS NOT NULL AND "countedCash" IS NOT NULL)))`);
    await q.query(`CREATE UNIQUE INDEX "UQ_cashier_open_shift" ON "cashier_shifts" ("hospitalId","cashierId") WHERE "closedAt" IS NULL`);
    await q.query(`CREATE TABLE "hmo_claims" (
      "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(), "hospitalId" uuid NOT NULL REFERENCES "hospitals"("id") ON DELETE RESTRICT,
      "payerId" uuid NOT NULL REFERENCES "payers"("id") ON DELETE RESTRICT, "invoiceId" uuid NOT NULL REFERENCES "invoices"("id") ON DELETE RESTRICT,
      "claimNumber" varchar(80), "claimType" varchar(30) NOT NULL CHECK ("claimType" IN ('CAPITATION','FEE_FOR_SERVICE')),
      "amountClaimed" numeric(12,2) NOT NULL CHECK ("amountClaimed" >= 0), "amountApproved" numeric(12,2),
      "status" varchar(20) NOT NULL DEFAULT 'DRAFT' CHECK ("status" IN ('DRAFT','SUBMITTED','ACCEPTED','PARTIAL','REJECTED','PAID')),
      "submittedAt" timestamptz, "paidAt" timestamptz, "notes" text, "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now())`);

    // Inpatient, nursing and maternity registries.
    await q.query(`CREATE TABLE "wards" (
      "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(), "hospitalId" uuid NOT NULL REFERENCES "hospitals"("id") ON DELETE RESTRICT,
      "name" varchar(100) NOT NULL, "wardType" varchar(30) NOT NULL DEFAULT 'GENERAL', "isActive" boolean NOT NULL DEFAULT true,
      "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(), CONSTRAINT "UQ_wards_name" UNIQUE ("hospitalId","name"))`);
    await q.query(`CREATE TABLE "beds" (
      "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(), "hospitalId" uuid NOT NULL REFERENCES "hospitals"("id") ON DELETE RESTRICT,
      "wardId" uuid NOT NULL REFERENCES "wards"("id") ON DELETE RESTRICT, "bedNumber" varchar(30) NOT NULL,
      "status" varchar(20) NOT NULL DEFAULT 'AVAILABLE' CHECK ("status" IN ('AVAILABLE','OCCUPIED','MAINTENANCE')),
      "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(), CONSTRAINT "UQ_beds_ward_number" UNIQUE ("wardId","bedNumber"))`);
    await q.query(`CREATE TABLE "admissions" (
      "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(), "hospitalId" uuid NOT NULL REFERENCES "hospitals"("id") ON DELETE RESTRICT,
      "visitId" uuid NOT NULL REFERENCES "visits"("id") ON DELETE RESTRICT, "patientId" uuid NOT NULL REFERENCES "patients"("id") ON DELETE RESTRICT,
      "bedId" uuid NOT NULL REFERENCES "beds"("id") ON DELETE RESTRICT, "admittedById" uuid NOT NULL REFERENCES "staff_users"("id") ON DELETE RESTRICT,
      "admittedAt" timestamptz NOT NULL DEFAULT now(), "dischargedAt" timestamptz, "dischargedById" uuid REFERENCES "staff_users"("id") ON DELETE SET NULL,
      "diagnosis" text, "dischargeSummary" text, "status" varchar(20) NOT NULL DEFAULT 'ADMITTED' CHECK ("status" IN ('ADMITTED','TRANSFERRED','DISCHARGED')),
      "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now())`);
    await q.query(`CREATE UNIQUE INDEX "UQ_bed_active_admission" ON "admissions" ("bedId") WHERE "status" = 'ADMITTED'`);
    await q.query(`CREATE TABLE "nursing_observations" (
      "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(), "hospitalId" uuid NOT NULL REFERENCES "hospitals"("id") ON DELETE RESTRICT,
      "admissionId" uuid NOT NULL REFERENCES "admissions"("id") ON DELETE RESTRICT, "recordedById" uuid NOT NULL REFERENCES "staff_users"("id") ON DELETE RESTRICT,
      "recordedAt" timestamptz NOT NULL DEFAULT now(), "temperatureC" numeric(4,1), "pulseBpm" smallint, "respiratoryRate" smallint,
      "systolicBp" smallint, "diastolicBp" smallint, "spo2" smallint, "painScore" smallint, "notes" text,
      "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now())`);
    await q.query(`CREATE TABLE "antenatal_records" (
      "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(), "hospitalId" uuid NOT NULL REFERENCES "hospitals"("id") ON DELETE RESTRICT,
      "patientId" uuid NOT NULL REFERENCES "patients"("id") ON DELETE RESTRICT, "enrolledById" uuid NOT NULL REFERENCES "staff_users"("id") ON DELETE RESTRICT,
      "lmpDate" date, "eddDate" date, "gravida" smallint, "para" smallint, "bloodGroup" varchar(5), "riskNotes" text,
      "status" varchar(20) NOT NULL DEFAULT 'ACTIVE' CHECK ("status" IN ('ACTIVE','DELIVERED','CLOSED')),
      "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now())`);
    await q.query(`CREATE TABLE "antenatal_visits" (
      "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(), "hospitalId" uuid NOT NULL REFERENCES "hospitals"("id") ON DELETE RESTRICT,
      "antenatalRecordId" uuid NOT NULL REFERENCES "antenatal_records"("id") ON DELETE RESTRICT, "visitDate" date NOT NULL,
      "gestationalWeeks" smallint, "weightKg" numeric(5,1), "bloodPressure" varchar(20), "foetalHeartRate" smallint, "notes" text,
      "recordedById" uuid NOT NULL REFERENCES "staff_users"("id") ON DELETE RESTRICT, "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now())`);
    await q.query(`CREATE TABLE "immunization_records" (
      "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(), "hospitalId" uuid NOT NULL REFERENCES "hospitals"("id") ON DELETE RESTRICT,
      "patientId" uuid NOT NULL REFERENCES "patients"("id") ON DELETE RESTRICT, "vaccineName" varchar(100) NOT NULL, "dose" varchar(40),
      "administeredAt" timestamptz NOT NULL, "batchNumber" varchar(50), "administeredById" uuid NOT NULL REFERENCES "staff_users"("id") ON DELETE RESTRICT,
      "notes" text, "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now())`);
    await q.query(`CREATE TABLE "family_planning_records" (
      "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(), "hospitalId" uuid NOT NULL REFERENCES "hospitals"("id") ON DELETE RESTRICT,
      "patientId" uuid NOT NULL REFERENCES "patients"("id") ON DELETE RESTRICT, "method" varchar(100) NOT NULL, "startedAt" date NOT NULL,
      "reviewAt" date, "status" varchar(20) NOT NULL DEFAULT 'ACTIVE' CHECK ("status" IN ('ACTIVE','DISCONTINUED')),
      "counselledById" uuid NOT NULL REFERENCES "staff_users"("id") ON DELETE RESTRICT, "notes" text,
      "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now())`);

    await q.query(`CREATE TABLE "stock_adjustments" (
      "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(), "hospitalId" uuid NOT NULL REFERENCES "hospitals"("id") ON DELETE RESTRICT,
      "drugBatchId" uuid NOT NULL REFERENCES "drug_batches"("id") ON DELETE RESTRICT, "quantityDelta" integer NOT NULL CHECK ("quantityDelta" <> 0),
      "reason" varchar(30) NOT NULL CHECK ("reason" IN ('WRITE_OFF','RETURN','CORRECTION','DAMAGE','EXPIRED','RECALL')),
      "notes" text, "adjustedById" uuid NOT NULL REFERENCES "staff_users"("id") ON DELETE RESTRICT, "adjustedAt" timestamptz NOT NULL DEFAULT now(),
      "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now())`);
    await q.query(`CREATE INDEX "IDX_stock_adjustments_batch" ON "stock_adjustments" ("hospitalId","drugBatchId","adjustedAt" DESC)`);

    // Composite tenant FKs prevent accidentally connecting a record to a parent in another hospital.
    for (const table of ['patients','doctors','appointments','medical_records','prescriptions','invoices','payments','audit_logs']) {
      await q.query(`CREATE UNIQUE INDEX IF NOT EXISTS "UQ_${table}_id_hospital" ON "${table}" ("id","hospitalId")`);
    }
    await q.query(`CREATE UNIQUE INDEX IF NOT EXISTS "UQ_staff_users_id_hospital" ON "staff_users" ("id","hospitalId")`);
    await q.query(`ALTER TABLE "appointments" ADD CONSTRAINT "FK_appointments_patient_tenant" FOREIGN KEY ("patientId","hospitalId") REFERENCES "patients"("id","hospitalId") ON DELETE RESTRICT`);
    await q.query(`ALTER TABLE "appointments" ADD CONSTRAINT "FK_appointments_doctor_tenant" FOREIGN KEY ("doctorId","hospitalId") REFERENCES "doctors"("id","hospitalId") ON DELETE RESTRICT`);
    await q.query(`ALTER TABLE "medical_records" ADD CONSTRAINT "FK_medical_records_patient_tenant" FOREIGN KEY ("patientId","hospitalId") REFERENCES "patients"("id","hospitalId") ON DELETE RESTRICT`);
    await q.query(`ALTER TABLE "medical_records" ADD CONSTRAINT "FK_medical_records_doctor_tenant" FOREIGN KEY ("doctorId","hospitalId") REFERENCES "doctors"("id","hospitalId") ON DELETE RESTRICT`);
    await q.query(`ALTER TABLE "prescriptions" ADD CONSTRAINT "FK_prescriptions_patient_tenant" FOREIGN KEY ("patientId","hospitalId") REFERENCES "patients"("id","hospitalId") ON DELETE RESTRICT`);
    await q.query(`ALTER TABLE "prescriptions" ADD CONSTRAINT "FK_prescriptions_doctor_tenant" FOREIGN KEY ("doctorId","hospitalId") REFERENCES "doctors"("id","hospitalId") ON DELETE RESTRICT`);
    await q.query(`ALTER TABLE "invoices" ADD CONSTRAINT "FK_invoices_patient_tenant" FOREIGN KEY ("patientId","hospitalId") REFERENCES "patients"("id","hospitalId") ON DELETE RESTRICT`);
    await q.query(`ALTER TABLE "payments" ADD CONSTRAINT "FK_payments_invoice_tenant" FOREIGN KEY ("invoiceId","hospitalId") REFERENCES "invoices"("id","hospitalId") ON DELETE RESTRICT`);
    const tenantTables = [
      'payers','patient_coverages','visits','visit_authorizations','triage_records','consultation_diagnoses','patient_allergies',
      'lab_tests','lab_test_parameters','lab_parameter_ranges','lab_orders','lab_order_items','lab_results','drugs','drug_batches','dispensings',
      'service_catalog','service_prices','invoice_items','cashier_shifts','hmo_claims','wards','beds','admissions','nursing_observations',
      'antenatal_records','antenatal_visits','immunization_records','family_planning_records','stock_adjustments',
    ];
    for (const table of tenantTables) {
      await q.query(`CREATE UNIQUE INDEX "UQ_${table}_id_hospital" ON "${table}" ("id","hospitalId")`);
    }
    await q.query(`ALTER TABLE "medical_records" ADD CONSTRAINT "FK_medical_records_visit_tenant" FOREIGN KEY ("visitId","hospitalId") REFERENCES "visits"("id","hospitalId") ON DELETE RESTRICT`);
    await q.query(`ALTER TABLE "invoices" ADD CONSTRAINT "FK_invoices_visit_tenant" FOREIGN KEY ("visitId","hospitalId") REFERENCES "visits"("id","hospitalId") ON DELETE RESTRICT`);
    const tenantRelations: Array<[string, string, string, string]> = [
      ['audit_logs','actorId','staff_users','actor'], ['patients','userId','staff_users','user'], ['doctors','userId','staff_users','user'], ['payments','receivedById','staff_users','received_by'],
      ['patient_coverages','patientId','patients','patient'], ['patient_coverages','payerId','payers','payer'],
      ['visits','patientId','patients','patient'], ['visits','appointmentId','appointments','appointment'], ['visits','payerId','payers','payer'], ['visits','doctorId','doctors','doctor'], ['visits','registeredById','staff_users','registered_by'],
      ['visit_authorizations','visitId','visits','visit'], ['visit_authorizations','payerId','payers','payer'], ['visit_authorizations','requestedById','staff_users','requested_by'],
      ['triage_records','visitId','visits','visit'], ['triage_records','recordedById','staff_users','recorded_by'],
      ['consultation_diagnoses','medicalRecordId','medical_records','medical_record'], ['patient_allergies','patientId','patients','patient'], ['patient_allergies','recordedById','staff_users','recorded_by'],
      ['lab_test_parameters','labTestId','lab_tests','lab_test'], ['lab_parameter_ranges','parameterId','lab_test_parameters','parameter'],
      ['lab_orders','visitId','visits','visit'], ['lab_orders','patientId','patients','patient'], ['lab_orders','medicalRecordId','medical_records','medical_record'], ['lab_orders','orderedById','staff_users','ordered_by'],
      ['lab_order_items','labOrderId','lab_orders','lab_order'], ['lab_order_items','labTestId','lab_tests','lab_test'], ['lab_results','orderItemId','lab_order_items','order_item'],
      ['drug_batches','drugId','drugs','drug'], ['drug_batches','receivedById','staff_users','received_by'], ['dispensings','drugBatchId','drug_batches','drug_batch'], ['dispensings','prescriptionId','prescriptions','prescription'], ['dispensings','dispensedById','staff_users','dispensed_by'],
      ['service_prices','serviceId','service_catalog','service'], ['service_prices','payerId','payers','payer'], ['invoice_items','invoiceId','invoices','invoice'], ['invoice_items','serviceId','service_catalog','service'],
      ['cashier_shifts','cashierId','staff_users','cashier'], ['hmo_claims','payerId','payers','payer'], ['hmo_claims','invoiceId','invoices','invoice'],
      ['beds','wardId','wards','ward'], ['admissions','visitId','visits','visit'], ['admissions','patientId','patients','patient'], ['admissions','bedId','beds','bed'], ['admissions','admittedById','staff_users','admitted_by'], ['admissions','dischargedById','staff_users','discharged_by'],
      ['nursing_observations','admissionId','admissions','admission'], ['nursing_observations','recordedById','staff_users','recorded_by'],
      ['antenatal_records','patientId','patients','patient'], ['antenatal_records','enrolledById','staff_users','enrolled_by'], ['antenatal_visits','antenatalRecordId','antenatal_records','antenatal_record'], ['antenatal_visits','recordedById','staff_users','recorded_by'],
      ['immunization_records','patientId','patients','patient'], ['immunization_records','administeredById','staff_users','administered_by'], ['family_planning_records','patientId','patients','patient'], ['family_planning_records','counselledById','staff_users','counselled_by'],
      ['stock_adjustments','drugBatchId','drug_batches','drug_batch'], ['stock_adjustments','adjustedById','staff_users','adjusted_by'],
    ];
    for (const [table, column, target, label] of tenantRelations) {
      await q.query(`ALTER TABLE "${table}" ADD CONSTRAINT "FK_${table}_${label}_tenant" FOREIGN KEY ("${column}","hospitalId") REFERENCES "${target}"("id","hospitalId") ON DELETE RESTRICT`);
    }
  }

  async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE IF EXISTS "platform_audit_logs"`);
    const tenantRelations: Array<[string, string]> = [
      ['audit_logs','actor'],['patients','user'],['doctors','user'],['payments','received_by'],['patient_coverages','patient'],['patient_coverages','payer'],['visits','patient'],['visits','appointment'],['visits','payer'],['visits','doctor'],['visits','registered_by'],
      ['visit_authorizations','visit'],['visit_authorizations','payer'],['visit_authorizations','requested_by'],['triage_records','visit'],['triage_records','recorded_by'],
      ['consultation_diagnoses','medical_record'],['patient_allergies','patient'],['patient_allergies','recorded_by'],['lab_test_parameters','lab_test'],['lab_parameter_ranges','parameter'],
      ['lab_orders','visit'],['lab_orders','patient'],['lab_orders','medical_record'],['lab_orders','ordered_by'],['lab_order_items','lab_order'],['lab_order_items','lab_test'],['lab_results','order_item'],
      ['drug_batches','drug'],['drug_batches','received_by'],['dispensings','drug_batch'],['dispensings','prescription'],['dispensings','dispensed_by'],['service_prices','service'],['service_prices','payer'],['invoice_items','invoice'],['invoice_items','service'],['cashier_shifts','cashier'],['hmo_claims','payer'],['hmo_claims','invoice'],
      ['beds','ward'],['admissions','visit'],['admissions','patient'],['admissions','bed'],['admissions','admitted_by'],['admissions','discharged_by'],['nursing_observations','admission'],['nursing_observations','recorded_by'],['antenatal_records','patient'],['antenatal_records','enrolled_by'],['antenatal_visits','antenatal_record'],['antenatal_visits','recorded_by'],['immunization_records','patient'],['immunization_records','administered_by'],['family_planning_records','patient'],['family_planning_records','counselled_by'],['stock_adjustments','drug_batch'],['stock_adjustments','adjusted_by'],
    ];
    for (const [table, label] of tenantRelations) await q.query(`ALTER TABLE "${table}" DROP CONSTRAINT IF EXISTS "FK_${table}_${label}_tenant"`);
    await q.query(`ALTER TABLE "invoices" DROP CONSTRAINT IF EXISTS "FK_invoices_visit_tenant"`);
    await q.query(`DROP INDEX IF EXISTS "IDX_invoices_visit"`);
    await q.query(`ALTER TABLE "invoices" DROP COLUMN IF EXISTS "visitId"`);
    await q.query(`ALTER TABLE "medical_records" DROP CONSTRAINT IF EXISTS "FK_medical_records_visit_tenant"`);
    await q.query(`DROP INDEX IF EXISTS "UQ_medical_records_visit"`);
    await q.query(`DROP INDEX IF EXISTS "UQ_visits_appointment"`);
    await q.query(`ALTER TABLE "medical_records" DROP COLUMN IF EXISTS "visitId"`);
    await q.query(`ALTER TABLE "payments" DROP CONSTRAINT IF EXISTS "FK_payments_invoice_tenant"`);
    await q.query(`ALTER TABLE "invoices" DROP CONSTRAINT IF EXISTS "FK_invoices_patient_tenant"`);
    await q.query(`ALTER TABLE "prescriptions" DROP CONSTRAINT IF EXISTS "FK_prescriptions_doctor_tenant"`);
    await q.query(`ALTER TABLE "prescriptions" DROP CONSTRAINT IF EXISTS "FK_prescriptions_patient_tenant"`);
    await q.query(`ALTER TABLE "medical_records" DROP CONSTRAINT IF EXISTS "FK_medical_records_doctor_tenant"`);
    await q.query(`ALTER TABLE "medical_records" DROP CONSTRAINT IF EXISTS "FK_medical_records_patient_tenant"`);
    await q.query(`ALTER TABLE "appointments" DROP CONSTRAINT IF EXISTS "FK_appointments_doctor_tenant"`);
    await q.query(`ALTER TABLE "appointments" DROP CONSTRAINT IF EXISTS "FK_appointments_patient_tenant"`);
    for (const table of ['patients','doctors','appointments','medical_records','prescriptions','invoices','payments','audit_logs']) {
      await q.query(`DROP INDEX IF EXISTS "UQ_${table}_id_hospital"`);
    }
    await q.query(`DROP INDEX IF EXISTS "UQ_staff_users_id_hospital"`);
    for (const table of ['payers','patient_coverages','visits','visit_authorizations','triage_records','consultation_diagnoses','patient_allergies','lab_tests','lab_test_parameters','lab_parameter_ranges','lab_orders','lab_order_items','lab_results','drugs','drug_batches','dispensings','service_catalog','service_prices','invoice_items','cashier_shifts','hmo_claims','wards','beds','admissions','nursing_observations','antenatal_records','antenatal_visits','immunization_records','family_planning_records','stock_adjustments']) await q.query(`DROP INDEX IF EXISTS "UQ_${table}_id_hospital"`);
    for (const table of ['stock_adjustments','family_planning_records','immunization_records','antenatal_visits','antenatal_records','nursing_observations','admissions','beds','wards','hmo_claims','cashier_shifts','invoice_items','service_prices','service_catalog','dispensings','drug_batches','drugs','lab_results','lab_order_items','lab_orders','lab_parameter_ranges','lab_test_parameters','lab_tests','patient_allergies','consultation_diagnoses','icd10_codes','triage_records','visit_authorizations','visits','patient_coverages','payers']) {
      await q.query(`DROP TABLE IF EXISTS "${table}" CASCADE`);
    }
    await q.query(`ALTER TABLE "prescriptions" DROP COLUMN IF EXISTS "status"`);
    await q.query(`ALTER TABLE "prescriptions" DROP COLUMN IF EXISTS "quantityPrescribed"`);
    await q.query(`ALTER TABLE "prescriptions" DROP COLUMN IF EXISTS "drugId"`);
    await q.query(`ALTER TABLE "patients" DROP CONSTRAINT IF EXISTS "CHK_patients_gender"`);
    await q.query(`ALTER TABLE "patients" ALTER COLUMN "phone" DROP NOT NULL`);
    await q.query(`DROP INDEX IF EXISTS "UQ_doctors_hospital_email"`);
    await q.query(`CREATE UNIQUE INDEX IF NOT EXISTS "UQ_doctors_email_active" ON "doctors" ("email") WHERE "deletedAt" IS NULL`);
  }
}
