# CarePoint SaaS tenancy and rollout

## Tenancy rules

- The application uses a shared PostgreSQL database and schema. Every tenant-owned table has a non-null `hospitalId` referencing `hospitals`.
- The authenticated access token carries `hospitalId`. The API checks it against the persisted staff account; a caller cannot choose a hospital through request body, query string or URL.
- Tenant-facing services require a non-null hospital claim and scope reads, writes, updates, deletes, counters and audit queries to that hospital. Tenant-aware composite foreign keys prevent key relationships from crossing hospitals.
- `staff_users.hospitalId = NULL` is reserved for platform super-admins. Those users can access platform hospital provisioning, but tenant clinical services reject a missing hospital.
- A suspended hospital is blocked by the JWT guard.
- Tenant audit events are written to `audit_logs`; platform provisioning/authentication events are written separately to `platform_audit_logs`.

## Migrations

Apply migrations in order after backing up the database:

```bash
pnpm --filter @healthcare/api migration:show
pnpm --filter @healthcare/api migration:run
```

`1762000000000-HospitalTenancyFoundation` creates `Default Hospital`, assigns existing users and tenant-owned records to it without changing existing row IDs, adds patient numbers, and adds the hospital counter trigger. `1763000000000-ClinicalAndOperationsSchema` adds the outpatient, triage, insurance, diagnosis, allergy, laboratory, pharmacy, billing, inpatient, maternity, stock-adjustment, and platform-audit tables, plus tenant composite foreign keys.

For existing patients whose phone was empty, the migration assigns a clearly marked `NOT-PROVIDED-<id-prefix>` placeholder before enforcing `NOT NULL`. Staff must replace these placeholders with verified phone numbers; they are not real contact details. Unsupported legacy gender values are set to `NULL` for manual review. New patient registrations require `MALE` or `FEMALE`.

## Provisioning the platform administrator

After migrations, create the first platform super-admin once. Set secure environment variables and run:

```bash
PLATFORM_ADMIN_EMAIL=platform@example.com \
PLATFORM_ADMIN_NAME='Platform Administrator' \
PLATFORM_ADMIN_PASSWORD='use-a-long-unique-password' \
pnpm --filter @healthcare/api seed:platform-admin
```

The script refuses to overwrite an existing email. Remove `PLATFORM_ADMIN_PASSWORD` from the environment after seeding. Sign in with that account and use **Platform hospitals** to create a tenant and its first hospital administrator in one transaction. Never set an ordinary hospital administrator's `hospitalId` to `NULL`.

## Implemented application workflows

- Tenant-aware patients, doctors, appointments, medical records, prescriptions, invoices, payments, users and audit queries.
- Hospital provisioning/suspension, tenant admin creation, hospital-specific patient numbering and visit queue numbering in Nigeria time.
- Visits, queue priority, triage, consultation visit links, ICD-10 diagnosis records, patient allergies and allergy-review state.
- Payers, patient coverages and visit authorizations.
- Laboratory catalogue, parameters, sex/age reference ranges, order creation, specimen collection and result entry with copied units/ranges and numeric flags.
- Pharmacy catalogue, batches, FEFO dispensing, expiry checks, prescription quantity/status tracking and audited stock adjustments.
- Service catalogue/prices, invoice items, cashier shifts, HMO claim state transitions and revenue/claims/stock/NHMIS summary endpoints.
- Wards, beds, admission/discharge, nursing observations, antenatal records/visits, immunization and family-planning records.
- Dashboard screens for visits, laboratory, pharmacy, inpatient, maternity, reports and platform hospital provisioning.

## Remaining release gates

This patch substantially extends the implementation, but it must not be described as production-verified until dependencies are available and the full build, migrations, unit tests, integration tests and end-to-end tests have passed against PostgreSQL. This environment could not reach the npm registry, so that verification could not be run here.

Before selling the product:

1. Add automated two-hospital isolation tests for every route and cross-tenant foreign-key rejection; add concurrency tests for patient/visit counters, cashier shifts, claim transitions and FEFO dispensing.
2. Review the remaining clinical workflow with hospital staff. In particular, validate pay-before-service rules, HMO authorization requirements, prescription policy and clinical escalation with real users.
3. Import an approved ICD-10 catalogue and lab reference ranges. Reference ranges must be validated by a qualified Nigerian laboratory scientist; no default clinical ranges are seeded here.
4. Validate the included browser-print receipt, patient-card/Code 39 barcode and lab-report layouts with real thermal printers and barcode readers; tune paper widths and output where required.
5. Decide cloud-only versus offline/downtime or on-premise sync architecture before implementing offline writes. Offline sync is not implemented by this patch.
6. Complete a security/privacy assessment, access reviews, backups and restore drills, encryption/secret rotation, incident response, retention policy and NDPA 2023/NDPC legal review. This document is not legal advice.
7. Review and harden the fixed role matrix. Configurable permissions are not implemented; roles are fixed in the API.

Do not enable a second production hospital until the database migration succeeds on a staging copy and the isolation/security test suite passes.
