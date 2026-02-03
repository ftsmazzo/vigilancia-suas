import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.warn('DATABASE_URL não definida; conexão com Postgres indisponível.');
}

const pool = new Pool({
  connectionString,
  max: 10,
  idleTimeoutMillis: 30000,
});

export async function query<T = unknown>(
  text: string,
  params?: unknown[]
): Promise<{ rows: T[]; rowCount: number }> {
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return { rows: (result.rows as T[]) || [], rowCount: result.rowCount ?? 0 };
  } finally {
    client.release();
  }
}

export async function queryMultiple(scripts: string[]): Promise<void> {
  const client = await pool.connect();
  try {
    for (const sql of scripts) {
      if (!sql.trim()) continue;
      await client.query(sql);
    }
  } finally {
    client.release();
  }
}

export default pool;
