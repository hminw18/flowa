import { Pool, type QueryResultRow } from 'pg';

let pool: Pool | null = null;

function getPool(): Pool {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required for Postgres storage');
  }

  if (!pool) {
    const useSsl =
      process.env.DATABASE_SSL === 'true' ||
      /sslmode=require|ssl=true/i.test(databaseUrl) ||
      process.env.NODE_ENV === 'production';

    pool = new Pool({
      connectionString: databaseUrl,
      ssl: useSsl ? { rejectUnauthorized: false } : undefined,
    });
  }

  return pool;
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: Array<string | number | null>
) {
  const result = await getPool().query<T>(text, params);
  return result;
}
