/**
 * Executa create_schema_app.sql na primeira subida do container.
 * Idempotente (CREATE IF NOT EXISTS). Roda antes de iniciar o Next.js.
 */
const { readFileSync } = require('fs');
const { join } = require('path');
const { Client } = require('pg');

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.warn('[init-db] DATABASE_URL não definida; pulando init do banco.');
    process.exit(0);
  }

  const sqlPath = process.env.INIT_DB_SQL_PATH || join(process.cwd(), 'create_schema_app.sql');
  let sql;
  try {
    sql = readFileSync(sqlPath, 'utf8');
  } catch (e) {
    console.warn('[init-db] Arquivo SQL não encontrado:', sqlPath, e.message);
    process.exit(0);
  }

  const client = new Client({ connectionString: url });
  try {
    await client.connect();
    const statements = sql
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith('--'));
    for (const st of statements) {
      if (st) await client.query(st + ';');
    }
    console.log('[init-db] Schema app aplicado com sucesso.');
  } catch (e) {
    console.error('[init-db] Erro ao aplicar schema:', e.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
