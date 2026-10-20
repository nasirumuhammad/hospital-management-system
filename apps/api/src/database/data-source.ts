import 'dotenv/config';
import 'reflect-metadata';
import { join } from 'node:path';
import { DataSource } from 'typeorm';
import { buildDatabaseOptions } from './database-options';

const SOURCE_ROOT = join(__dirname, '..');
const DATABASE_URL_MISSING_MESSAGE = 'DATABASE_URL is not defined';

function requireDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error(DATABASE_URL_MISSING_MESSAGE);
  return url;
}

export default new DataSource({
  ...buildDatabaseOptions({
    DATABASE_URL: requireDatabaseUrl(),
    DATABASE_SSL: process.env.DATABASE_SSL === 'true',
  }),
  entities: [join(SOURCE_ROOT, '**', '*.entity{.ts,.js}')],
  migrations: [join(__dirname, 'migrations', '*{.ts,.js}')],
  synchronize: false,
});
