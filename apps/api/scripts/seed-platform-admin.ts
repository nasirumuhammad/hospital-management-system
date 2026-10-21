import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import dataSource from '../src/database/data-source';

async function main(): Promise<void> {
  const email = process.env.PLATFORM_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.PLATFORM_ADMIN_PASSWORD;
  const name = process.env.PLATFORM_ADMIN_NAME?.trim() || 'Platform Administrator';
  if (!email || !password || password.length < 12) {
    throw new Error('Set PLATFORM_ADMIN_EMAIL and PLATFORM_ADMIN_PASSWORD (at least 12 characters) before running this script.');
  }
  await dataSource.initialize();
  try {
    const existing = await dataSource.query('SELECT "id" FROM "staff_users" WHERE "email"=$1', [email]);
    if (existing.length) throw new Error('An account with PLATFORM_ADMIN_EMAIL already exists; refusing to change it.');
    const passwordHash = await bcrypt.hash(password, 12);
    const [user] = await dataSource.query(
      `INSERT INTO "staff_users" ("email","passwordHash","name","role","hospitalId","isActive","tokenVersion","emailVerifiedAt") VALUES ($1,$2,$3,'SUPER_ADMIN',NULL,true,0,now()) RETURNING "id","email","name","role"`,
      [email, passwordHash, name],
    );
    process.stdout.write(`Created platform super-admin ${user.email} (${user.id}). Store the credentials securely and unset PLATFORM_ADMIN_PASSWORD.\n`);
  } finally {
    await dataSource.destroy();
  }
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : 'Platform admin seed failed'}\n`);
  process.exitCode = 1;
});
