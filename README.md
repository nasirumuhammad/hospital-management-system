# CarePoint — Hospital Management System

A TypeScript monorepo: **NestJS** REST API, **Next.js** dashboard, **PostgreSQL**.

| | |
|---|---|
| `apps/api` | NestJS 11 + TypeORM, feature modules (`auth`, `users`, `patients`, `doctors`, `appointments`, `medical-records`, `prescriptions`, `invoices`, `audit`, `dashboard`, `mail`) |
| `apps/web` | Next.js 16 (App Router) dashboard for admins, doctors and patients |
| `packages/types` | Response types shared with the web app |

## What it does

- **Roles:** `ADMIN`, `DOCTOR`, `PATIENT`, enforced by global guards; every clinical and billing query is scoped server-side (patients see only their own data, doctors only what they authored or are assigned).
- **Sessions:** short-lived access token plus rotating refresh token, both in **HttpOnly cookies**. Replaying a used refresh token signs the account out everywhere. Password change/reset, disabling an account and "sign out of all devices" revoke every session immediately.
- **Account recovery:** password reset and email verification (single-use, hashed, expiring tokens; identical responses whether or not an account exists).
- **Appointments:** status workflow (`PENDING → CONFIRMED → COMPLETED`, `CANCELLED`), patient self-cancel, admin reschedule, double-booking prevention (service check plus a database unique index).
- **Clinical:** medical records (doctor-authored, reads are audited) and prescriptions.
- **Billing:** invoices, payments ledger with partial payments, void, safe under concurrent payments (row lock, integer minor units).
- **Audit trail** of sign-ins, account/profile changes, record access and money movements; admin viewer with filters.
- **Soft deletion** for patients, doctors and appointments; clinical and billing history stays intact.
- Uniform pagination (`{ items, total, page, limit, pages }`), `GET /api/health`, structured logs (pino) that omit headers and query strings.

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

All routes are under `/api`. Cookie-authenticated writes must come from an origin listed in `WEB_ORIGIN` (CSRF defence); non-browser clients can send `Authorization: Bearer <access token>` instead.

| Area | Routes |
|---|---|
| Auth | `POST auth/login · refresh · logout · logout-all · forgot-password · reset-password · verify-email · resend-verification`, `GET auth/me`, `PATCH auth/password` |
| Users (admin) | `GET/POST users`, `PATCH users/:id/active`, `POST users/link-profile` |
| Patients | `GET patients` (admin, doctor), `GET patients/me`, `GET/PATCH/DELETE patients/:id`, `POST patients` |
| Doctors | `GET/POST doctors`, `GET/PATCH/DELETE doctors/:id` |
| Appointments | `GET/POST appointments`, `GET/PATCH/DELETE appointments/:id`, `PATCH appointments/:id/status`, `POST appointments/:id/cancel` |
| Clinical | `GET/POST medical-records`, `GET/PATCH medical-records/:id`, `GET/POST prescriptions`, `GET prescriptions/:id` |
| Billing | `GET/POST invoices`, `GET invoices/:id`, `POST invoices/:id/payments`, `POST invoices/:id/void` |
| Other | `GET dashboard/summary`, `GET audit-logs` (admin), `GET health` |

| Action | Admin | Doctor | Patient |
|---|:-:|:-:|:-:|
| Patient directory | all | all | own profile |
| Create/edit/remove patients and doctors | ✓ | | |
| Appointments | all | own | own |
| Book appointment | ✓ | | own |
| Change appointment status | ✓ | own | cancel own |
| Medical records / prescriptions | read | read + write own | read own |
| Invoices and payments | manage | | read own |
| Accounts, audit log | ✓ | | |

## Deployment notes

Read `docs/PRODUCTION-CHECKLIST.md` first. Essentials: serve web and API over HTTPS on the same registrable domain (cookies are `SameSite=Lax`, `Secure` in production), set `TRUST_PROXY`, real `JWT_SECRET`, `MAIL_TRANSPORT=resend` with `RESEND_API_KEY` and `MAIL_FROM`, run `migration:run:prod` before starting the new API version, and remove `ADMIN_*` after the first start.
`docs/LEGACY-MIGRATION.md` describes importing data from the original PHP/MySQL system, which needs its database dump and has not been performed.
