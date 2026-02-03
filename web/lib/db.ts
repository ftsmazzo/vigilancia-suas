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

const REFRESH_MV_NAME = /REFRESH\s+MATERIALIZED\s+VIEW\s+(?:CONCURRENTLY\s+)?(\w+)/i;

export async function runRefreshStatements(scripts: string[]): Promise<{
  refreshed: string[];
  failed: { name: string; error: string }[];
}> {
  const refreshed: string[] = [];
  const failed: { name: string; error: string }[] = [];
  const client = await pool.connect();
  try {
    for (const sql of scripts) {
      const trimmed = sql.trim();
      if (!trimmed) continue;
      const match = trimmed.match(REFRESH_MV_NAME);
      const name = match ? match[1] : trimmed.slice(0, 50);
      try {
        await client.query(trimmed);
        refreshed.push(name);
      } catch (e) {
        failed.push({ name, error: e instanceof Error ? e.message : String(e) });
      }
    }
    return { refreshed, failed };
  } finally {
    client.release();
  }
}

export default pool;
