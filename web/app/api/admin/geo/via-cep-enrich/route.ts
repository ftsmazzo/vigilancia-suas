/**
 * POST /api/admin/geo/via-cep-enrich
 * Passo 1: CEPs de vw_familias_territorio WHERE cep_territorio IS NULL → Via CEP (100 a 100) → INSERT na tabela intermediária tbl_via_cep.
 * Depois use "Copiar Via CEP → Geo" para levar esses registros para tbl_geo.
 * Rate limit: ~1 req/s.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession, requireAdmin } from '@/lib/auth';
import pool from '@/lib/db';

const VIA_CEP_BASE = 'https://viacep.com.br/ws';
const RATE_LIMIT_MS = 1100;
const LIMIT_PER_RUN = 100;

function cepNorm(cep: string | null): string | null {
  if (!cep || typeof cep !== 'string') return null;
  const digits = cep.replace(/\D/g, '').slice(0, 8);
  return digits.length === 8 ? digits : null;
}

async function ensureTables(client: import('pg').PoolClient): Promise<void> {
  await client.query(`
    CREATE TABLE IF NOT EXISTS tbl_via_cep (
      cep_norm TEXT PRIMARY KEY,
      logradouro TEXT,
      bairro TEXT,
      localidade TEXT,
      uf TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

export const maxDuration = 300;

export async function POST(request: NextRequest) {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }
  if (!requireAdmin(user)) {
    return NextResponse.json({ error: 'Acesso negado. Apenas administradores.' }, { status: 403 });
  }

  const client = await pool.connect();
  try {
    await ensureTables(client);

    // CEPs únicos sem território que ainda não estão na tabela intermediária Via CEP
    const { rows: cepsToFetch } = await client.query<{ cep_norm: string }>(`
      SELECT DISTINCT d_num_cep_logradouro_fam AS cep_norm
      FROM vw_familias_territorio
      WHERE cep_territorio IS NULL
        AND d_num_cep_logradouro_fam IS NOT NULL
        AND TRIM(d_num_cep_logradouro_fam) != ''
        AND NOT EXISTS (SELECT 1 FROM tbl_via_cep v WHERE v.cep_norm = vw_familias_territorio.d_num_cep_logradouro_fam)
      ORDER BY d_num_cep_logradouro_fam
      LIMIT $1
    `, [LIMIT_PER_RUN]);

    let inserted = 0;
    const errors: string[] = [];

    for (let i = 0; i < cepsToFetch.length; i++) {
      const cep = cepsToFetch[i].cep_norm;
      const norm = cepNorm(cep);
      if (!norm) continue;

      const { rows: already } = await client.query('SELECT 1 FROM tbl_via_cep WHERE cep_norm = $1', [norm]);
      if (already.length > 0) continue;

      let logradouro: string | null = null;
      let bairro: string | null = null;
      let localidade: string | null = null;
      let uf: string | null = null;

      await new Promise((r) => setTimeout(r, RATE_LIMIT_MS));
      try {
        const res = await fetch(`${VIA_CEP_BASE}/${norm}/json/`, { method: 'GET' });
        const data = await res.json().catch(() => ({}));
        if (data.erro === true) {
          errors.push(`CEP ${norm}: não encontrado`);
          continue;
        }
        logradouro = data.logradouro ?? null;
        bairro = data.bairro ?? null;
        localidade = data.localidade ?? null;
        uf = data.uf ?? null;
      } catch (e) {
        errors.push(`CEP ${norm}: ${e instanceof Error ? e.message : String(e)}`);
        continue;
      }

      await client.query(
        `INSERT INTO tbl_via_cep (cep_norm, logradouro, bairro, localidade, uf)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (cep_norm) DO UPDATE SET logradouro = EXCLUDED.logradouro, bairro = EXCLUDED.bairro, localidade = EXCLUDED.localidade, uf = EXCLUDED.uf`,
        [norm, logradouro, bairro, localidade, uf]
      );
      inserted++;
    }

    return NextResponse.json({
      ok: true,
      message: inserted > 0
        ? `${inserted} CEP(s) gravados na tabela Via CEP (${cepsToFetch.length} processados). Use "Copiar Via CEP → Geo" e depois "Atualizar match Geo".`
        : cepsToFetch.length === 0
          ? 'Nenhum CEP sem território pendente; todos já estão na tabela Via CEP.'
          : `${cepsToFetch.length} processados; ${inserted} gravados (outros deram erro).`,
      processed: cepsToFetch.length,
      inserted_via_cep: inserted,
      errors: errors.length ? errors.slice(0, 15) : undefined,
    });
  } catch (e) {
    console.error('via-cep-enrich', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Erro ao buscar Via CEP.' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
