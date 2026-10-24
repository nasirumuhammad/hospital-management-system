# CarePoint — Hospital Management System

A TypeScript monorepo: **NestJS** REST API, **Next.js** dashboard, **PostgreSQL**.

| | |
|---|---|
| `apps/api` | NestJS 11 + TypeORM, feature modules (`auth`, `users`, `patients`, `doctors`, `appointments`, `medical-records`, `prescriptions`, `invoices`, `audit`, `dashboard`, `mail`) |
| `apps/web` | Next.js 16 (App Router) dashboard for admins, doctors and patients |
| `packages/types` | Response types shared with the web app |

## What it does

- **Multi-tenant foundation:** shared database/schema with hospital IDs derived from the authenticated user, scoped tenant queries, composite tenant foreign keys and hospital suspension enforcement.
- **Platform provisioning:** super-admin route and dashboard to create/suspend hospitals and create the first hospital administrator. Tenant and platform audit events are stored separately.
- **Authentication:** access/refresh cookies, refresh-token rotation, password reset, email verification and token revocation.
- **Outpatient workflow:** patient registry and hospital numbers, appointments, visit registration, daily queue, triage, medical records, consultation diagnoses and allergy review.
- **Insurance:** payers, patient coverages and visit authorizations.
- **Laboratory:** test catalogue, parameters, age/sex ranges, lab orders, specimen collection and results with copied units/reference ranges and numeric flags.
- **Pharmacy:** drug catalogue, batch stock, earliest-expiry-first dispensing, expired-stock rejection, prescription quantities/statuses and audited stock adjustments.
- **Billing operations:** service catalogue/prices, invoice items, payments, cashier shifts and HMO claims transitions.
- **Inpatient and maternity:** wards, beds, admission/discharge, nursing observations, antenatal records/visits, immunization and family-planning registers.
- **Reports:** revenue by payment method, HMO claims ageing, stock/reorder/near-expiry and monthly NHMIS summary endpoints.
- **Frontend:** tenant dashboard pages for visits, laboratory, pharmacy, inpatient, maternity, reports and platform hospital provisioning.

## Important status note

The schema and application workflows are implemented as a substantial development patch, but a production build and test suite have **not** been verified in this environment because the npm registry was unreachable. Before production, complete the release gates in `docs/TENANCY-ROLLOUT.md`, especially two-tenant isolation tests, clinical review of the workflow, approved ICD-10/lab reference data, print layouts, offline strategy and NDPA/privacy review. Configurable permissions and offline sync are not included. Basic browser-print views for receipts, patient cards with Code 39 barcodes, and lab reports are included, but thermal-printer compatibility and barcode-reader validation remain untested.

## Requirements

Node.js 20+, pnpm 10 (`npm i -g pnpm`), PostgreSQL 14+.

## Setup

```bash
# 1. database (or: docker compose up -d postgres, which listens on 5433)
sudo -u postgres psql -c "CREATE USER healthcare_app WITH PASSWORD 'change_me';"
sudo -u postgres psql -c "CREATE DATABASE healthcare_db OWNER healthcare_app;"

# 2. configuration
cp apps/api/.env.example apps/api/.env          # edit secrets; see comments inside
cp apps/web/.env.example apps/web/.env.local

# 3. install, migrate, run
pnpm install
pnpm --filter @healthcare/api migration:run
pnpm dev                               # web :3000, api :4000
```

Sign in at http://localhost:3000 with `ADMIN_EMAIL` / `ADMIN_PASSWORD`. With `MAIL_TRANSPORT=console` (development), reset and verification links appear in the API log.

First-time data entry: create the doctor/patient records. Tick **Give this person a login** when adding a record (or click **Create login** on its row later) and the person is emailed an invitation to choose their own password; the account is linked to the record automatically. **Accounts → Add account** remains for administrators and for accounts with an admin-set temporary password; use **Link profile** to attach those to a record by hand.

## Hospital tenancy and platform bootstrap

Back up the database, then apply the tenancy and clinical operations migrations in order:

```bash
pnpm --filter @healthcare/api migration:show
pnpm --filter @healthcare/api migration:run
```

Existing rows are assigned to `Default Hospital` without changing IDs. Empty legacy phone values receive clearly marked `NOT-PROVIDED-<id-prefix>` placeholders that must be replaced with verified numbers; unknown legacy gender values are set to `NULL` for review.

Create the first platform super-admin once, after migrations:

```bash
PLATFORM_ADMIN_EMAIL=platform@example.com \
PLATFORM_ADMIN_NAME='Platform Administrator' \
PLATFORM_ADMIN_PASSWORD='use-a-long-unique-password' \
pnpm --filter @healthcare/api seed:platform-admin
```

Sign in as the platform admin and open **Platform hospitals** to provision a hospital and its first administrator. See `docs/TENANCY-ROLLOUT.md` for the complete rollout and security gates.

## Scripts

```bash
pnpm build                 # build api + web
pnpm test                  # unit tests
pnpm test:e2e              # end-to-end tests (needs PostgreSQL, see below)
pnpm typecheck
pnpm --filter @healthcare/api migration:run | migration:revert | migration:show
pnpm --filter @healthcare/api migration:run:prod   # against dist/, for deployments
```

End-to-end tests drop and recreate the database in `TEST_DATABASE_URL`
(default `postgresql://healthcare_app:change_me@localhost:5432/healthcare_test`). **Never point it at real data.**

## API summary

All routes are under `/api`. Cookie-authenticated writes must come from an origin listed in `WEB_ORIGIN`; non-browser clients can send `Authorization: Bearer <access token>`.

| Area | Routes |
|---|---|
| Platform | `GET/POST platform/hospitals`, `GET platform/hospitals/:id`, `PATCH platform/hospitals/:id/status` (super-admin) |
| Patients & appointments | `patients`, `doctors`, `appointments`, `visits`, `visits/:id/status`, `visits/:id/triage` |
| Clinical | `medical-records`, `medical-records/:id/diagnoses`, `clinical/icd10`, `patients/:id/allergies`, `patients/:id/coverages` |
| Laboratory | `lab/tests`, `lab/tests/:id/parameters`, `lab/parameters/:id/ranges`, `lab/orders`, `lab/order-items/:id/collect`, `lab/order-items/:id/results` |
| Pharmacy | `pharmacy/drugs`, `pharmacy/drugs/:id/batches`, `pharmacy/prescriptions/:id/dispense`, `pharmacy/dispense/walk-in`, `pharmacy/batches/:id/adjustments` |
| Billing & HMO | `billing/services`, service prices, invoice items, payers, claims, cashier shift open/close; existing `invoices/:id/payments` |
| Inpatient & maternity | `inpatient/wards`, beds, admissions/discharge/observations; `maternity/antenatal`, antenatal visits, immunizations and family planning |
| Reports | `reports/revenue`, `reports/claims-aging`, `reports/stock`, `reports/nhmis?month=YYYY-MM` |
| Other | `auth/*`, `users/*`, `dashboard/summary`, `audit-logs`, `health` |

See `docs/TENANCY-ROLLOUT.md` for role and deployment limitations. Lab ranges and ICD-10 reference data must be imported from approved sources before clinical use.

## Deployment notes

Read `docs/PRODUCTION-CHECKLIST.md` first. Essentials: serve web and API over HTTPS on the same registrable domain (cookies are `SameSite=Lax`, `Secure` in production), set `TRUST_PROXY`, real `JWT_SECRET`, `MAIL_TRANSPORT=resend` with `RESEND_API_KEY` and `MAIL_FROM`, run `migration:run:prod` before starting the new API version, and remove `ADMIN_*` after the first start.
`docs/LEGACY-MIGRATION.md` describes importing data from the original PHP/MySQL system, which needs its database dump and has not been performed.

## People vs. accounts

A sign-in account (`staff_users`) is separate from the person it belongs to:

| Person record | Table | Roles |
| --- | --- | --- |
| Patient | `patients` | PATIENT |
| Doctor | `doctors` | DOCTOR |
| Staff member | `staff_members` | ADMIN, NURSE, RECEPTIONIST, CASHIER, LAB, PHARMACIST, HMO_DESK, WARD_MANAGER |

- A person record can exist with no login, and a login can be given later (**Create login** / **Link profile**).
- **Deleting an account** (`DELETE /api/users/:id`, Accounts page) unlinks the person record and keeps it. The account row is soft-deleted, not erased, so triage, payments, dispensing and audit entries still say who did the work. The e-mail address is freed and the person can be given a new login.
- Creating a staff-role account on the Accounts page also creates its staff record; the role on the account and the staff record must match.
