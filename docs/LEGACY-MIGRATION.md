# Legacy PHP/MySQL migration runbook

The supplied PHP archive contains application source and connection files, but no MySQL dump or exported table data. The original application connects to a MySQL database named `sourcecodester_healthcaredb`; the target application uses PostgreSQL. Therefore historical patient/doctor/appointment data cannot be safely imported from the ZIP alone.

## 1. Export the source database

On the machine where the old PHP database is running, take a protected backup first:

```bash
mysqldump --single-transaction --routines --triggers sourcecodester_healthcaredb > healthcare-legacy.sql
```

Do not put the dump in Git or send it to an unapproved third party. It contains sensitive health information. Keep the file encrypted and restrict access.

## 2. Inspect and map before importing

```bash
mysql -u <legacy_user> -p -D sourcecodester_healthcaredb -e 'SHOW TABLES;'
```

The legacy archive has several PHP modules and may contain tables for users, doctors, patients, appointments, reports/treatments and medicine. Verify actual table names and columns from the live database; do not assume names from PHP filenames. Export each table to a UTF-8 CSV after reviewing it, then map into the corresponding PostgreSQL tables. The current target schema includes `staff_users`, `patients`, `doctors`, `appointments`, `medical_records`, `prescriptions`, and `invoices`.

## 3. Required data mapping decisions

- Preserve source primary keys in a separate `legacy_id` column or mapping table before import. Target primary keys are UUIDs; do not blindly cast numeric MySQL IDs to UUIDs.
- Normalize email addresses and resolve duplicate emails before loading because target patient, doctor, and user emails are unique.
- Match old appointment records to the correct patient and doctor using a deterministic mapping table. Quarantine rows with missing references instead of guessing.
- Never copy plaintext legacy passwords. Force password reset for imported accounts unless the source hash algorithm has been verified and migrated securely.
- Map historical clinical notes and prescriptions only after reviewing access permissions, consent/legal basis, retention obligations, and data minimization. Do not import unrelated or malformed fields.
- Store source IDs and import batch IDs in a restricted migration ledger so each row can be reconciled and rerun idempotently.

## 4. Validate before cutover

Import to a staging database first. Compare per-table counts, required-field nulls, duplicate emails, orphan foreign keys, appointment status totals, and sampled records. Have an authorized clinical/data owner approve the reconciliation. Take a final backup, schedule downtime/read-only mode, repeat the import, verify totals, and only then switch traffic. Keep the rollback plan and encrypted source backup according to your retention policy.

## Important

No production migration of historical patient data has been performed by this code change. The uploaded archive did not include the source SQL dump, and inventing mappings would risk corrupting patient records.
