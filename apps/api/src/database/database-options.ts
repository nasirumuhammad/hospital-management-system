import type { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';

export interface DatabaseEnvironment {
  DATABASE_URL: string;
  DATABASE_SSL?: boolean;
}

/**
 * Single source of truth for the PostgreSQL connection, shared by the Nest app
 * and the TypeORM CLI data source so the two can never drift apart.
 * DATABASE_SSL accepts the provider's certificate without a CA bundle (managed
 * databases commonly use their own CA); leave it off on a private network.
 */
export function buildDatabaseOptions(env: DatabaseEnvironment): PostgresConnectionOptions {
  return {
    type: 'postgres',
    url: env.DATABASE_URL,
    ssl: env.DATABASE_SSL ? { rejectUnauthorized: false } : false,
  };
}
