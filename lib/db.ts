import { Pool } from 'pg';

// Singleton Pool using DATABASE_URL
const globalForPg = globalThis as unknown as {
  pgPool?: Pool;
};

export const pgPool =
  globalForPg.pgPool ||
  new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 30000,
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPg.pgPool = pgPool;
}

export async function query<T = any>(text: string, params?: any[]): Promise<T[]> {
  const client = await pgPool.connect();
  try {
    const res = await client.query(text, params);
    return res.rows;
  } finally {
    client.release();
  }
}
