import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Separates the person from the sign-in account for every role, not only patients and doctors.
 *  1. staff_members: the person record for nurses, cashiers, lab, pharmacy, ward, front-desk and admin users.
 *  2. Backfills one staff member for every existing staff account and links it.
 *  3. staff_users.deletedAt: deleting an account keeps the row (history stays attributed) and unlinks the profile.
 */
export class StaffProfiles1765000000000 implements MigrationInterface {
  name = 'StaffProfiles1765000000000';

  async up(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE "staff_users" ADD COLUMN "deletedAt" timestamptz`);

    await q.query(`CREATE TABLE "staff_members" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
      "hospitalId" uuid NOT NULL,
      "firstName" varchar(100) NOT NULL,
      "lastName" varchar(100) NOT NULL,
      "email" varchar(180) NOT NULL,
      "phone" varchar(30),
      "role" varchar(20) NOT NULL,
      "jobTitle" varchar(120),
      "isActive" boolean NOT NULL DEFAULT true,
      "userId" uuid,
      "deletedAt" timestamptz,
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      "updatedAt" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "PK_staff_members_id" PRIMARY KEY ("id"),
      CONSTRAINT "CHK_staff_members_role" CHECK ("role" IN ('ADMIN','NURSE','RECEPTIONIST','CASHIER','LAB','PHARMACIST','HMO_DESK','WARD_MANAGER')),
      CONSTRAINT "FK_staff_members_hospital" FOREIGN KEY ("hospitalId") REFERENCES "hospitals"("id") ON DELETE RESTRICT,
      CONSTRAINT "FK_staff_members_user" FOREIGN KEY ("userId") REFERENCES "staff_users"("id") ON DELETE SET NULL
    )`);
    await q.query(`CREATE UNIQUE INDEX "UQ_staff_members_id_hospital" ON "staff_members" ("id","hospitalId")`);
    await q.query(`CREATE UNIQUE INDEX "UQ_staff_members_hospital_email" ON "staff_members" ("hospitalId","email") WHERE "deletedAt" IS NULL`);
    await q.query(`CREATE UNIQUE INDEX "UQ_staff_members_userId_active" ON "staff_members" ("userId") WHERE "deletedAt" IS NULL`);
    await q.query(`CREATE INDEX "IDX_staff_members_hospital_role" ON "staff_members" ("hospitalId","role")`);

    // One profile per existing staff account: first word of the name is the first name, the rest the last name.
    await q.query(`INSERT INTO "staff_members" ("hospitalId","firstName","lastName","email","role","isActive","userId")
      SELECT u."hospitalId",
             split_part(btrim(u."name"), ' ', 1),
             COALESCE(NULLIF(btrim(substr(btrim(u."name"), length(split_part(btrim(u."name"), ' ', 1)) + 1)), ''), '-'),
             u."email", u."role", u."isActive", u."id"
      FROM "staff_users" u
      WHERE u."hospitalId" IS NOT NULL
        AND u."role" IN ('ADMIN','NURSE','RECEPTIONIST','CASHIER','LAB','PHARMACIST','HMO_DESK','WARD_MANAGER')`);

    await q.query(`ALTER TABLE "staff_members" ADD CONSTRAINT "FK_staff_members_user_tenant" FOREIGN KEY ("userId","hospitalId") REFERENCES "staff_users"("id","hospitalId") ON DELETE RESTRICT`);
    // Same pairing patients and doctors already use: FK_staff_members_user (SET NULL) fires first and clears userId, so the
    // composite tenant FK (which only guards against linking an account from another hospital) has nothing left to restrict.
  }

  async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE "staff_members"`);
    await q.query(`ALTER TABLE "staff_users" DROP COLUMN "deletedAt"`);
  }
}
