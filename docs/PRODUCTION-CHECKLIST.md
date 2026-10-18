# Production readiness checklist

## Implemented in code

- [x] Schema managed only by migrations (`synchronize` is off); migrations apply, revert and match the entities (verified with `typeorm schema:log`).
- [x] Environment validated at startup; production refuses a placeholder `JWT_SECRET`, console mail transport and non-HTTPS `WEB_URL`.
- [x] HttpOnly, Secure (production), SameSite session cookies with refresh-token rotation, reuse detection and server-side revocation; no tokens in `localStorage`.
- [x] Password reset and email verification with expiring, single-use, hashed tokens and non-revealing responses.
- [x] Rate limiting on login, token and recovery endpoints (in-process; see below for multi-instance).
- [x] Authorization tests for every patient/doctor/clinical/billing access path, including cross-patient (IDOR) attempts, disabled users and session revocation.
- [x] Audit trail for authentication, account, record-access and money events; request logs omit headers and query strings.
- [x] Helmet security headers, strict CORS allow-list, CSRF origin check, `Cache-Control: no-store`.
- [x] Unit and end-to-end tests run in CI (`.github/workflows/ci.yml`).

## Still required before real patient data (infrastructure and people, not code)

- [ ] **Multi-instance rate limiting:** the built-in limiter is per process. Behind several instances, enforce limits at the reverse proxy or load balancer (or add a Redis store to `@nestjs/throttler`).
- [ ] PostgreSQL: dedicated least-privilege role, TLS (`DATABASE_SSL=true`), automated encrypted backups and a **tested restore**.
- [ ] Secrets in a secret manager; rotate anything that was ever committed or shared.
- [ ] HTTPS termination, `TRUST_PROXY` set to the real hop count, web and API on one registrable domain (or set `COOKIE_SAME_SITE` and `COOKIE_DOMAIN` deliberately).
- [ ] SMTP provider configured and deliverability tested (SPF/DKIM). Decide whether to set `REQUIRE_EMAIL_VERIFICATION=true`.
- [ ] Log shipping, alerting and retention for the audit log; an incident-response process.
- [ ] Confirm Nigeria Data Protection Act obligations (lawful basis, consent, retention/deletion, breach notification) with qualified counsel or your data-protection officer.
- [ ] Dependency and container vulnerability scanning; penetration test before go-live.
- [ ] Legacy data import (needs the original MySQL dump; see `LEGACY-MIGRATION.md`).
