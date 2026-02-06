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
  skipped: string[];
}> {
  const refreshed: string[] = [];
  const failed: { name: string; error: string }[] = [];
  const skipped: string[] = [];
  const client = await pool.connect();
  try {
    for (const sql of scripts) {
      const trimmed = sql.trim();
      if (!trimmed) continue;
      const match = trimmed.match(REFRESH_MV_NAME);
      const name = match ? match[1] : trimmed.slice(0, 50);
      if (name === 'mv_familias_geo' || name === 'mv_familias_geo_por_logradouro' || name === 'mv_familias_limpa' || name === 'mv_familias_geo_fuzzy') {
        const exists = await client.query(
          "SELECT 1 FROM pg_matviews WHERE schemaname = 'public' AND matviewname = $1",
          [name]
        );
        if (!exists.rows.length) {
          skipped.push(name);
          continue;
        }
      }
      try {
        await client.query(trimmed);
        refreshed.push(name);
      } catch (e) {
        const errMsg = e instanceof Error ? e.message : String(e);
        if (
          (name === 'mv_familias_geo' || name === 'mv_familias_geo_por_logradouro' || name === 'mv_familias_limpa' || name === 'mv_familias_geo_fuzzy') &&
          (errMsg.includes('unique index') || errMsg.includes('CONCURRENTLY'))
        ) {
          try {
            await client.query(`REFRESH MATERIALIZED VIEW ${name}`);
            refreshed.push(name);
          } catch (e2) {
            failed.push({ name, error: errMsg });
          }
        } else {
          failed.push({ name, error: errMsg });
        }
      }
    }
    return { refreshed, failed, skipped };
  } finally {
    client.release();
  }
}

export default pool;
