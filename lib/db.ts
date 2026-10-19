import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

// Automatically load DATABASE_URL from .env if not populated by runner
if (!process.env.DATABASE_URL) {
  try {
    const envPath = path.resolve(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf-8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (trimmed.startsWith('DATABASE_URL=')) {
          let val = trimmed.slice('DATABASE_URL='.length).trim();
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
          }
          process.env.DATABASE_URL = val;
          break;
        }
      }
    }
  } catch (e) {
    // Ignore error
  }
}

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
