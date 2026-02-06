/**
 * POST /api/admin/geo/via-cep-enrich
 * Enriquecer tbl_geo com endereços Via CEP para CEPs de famílias sem território.
 * Busca por CEP, insere logradouro/bairro na Geo; depois "Atualizar match Geo" encontra mais famílias.
 * Rate limit: ~1 req/s (Via CEP é gratuito mas limitado).
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession, requireAdmin } from '@/lib/auth';
import pool from '@/lib/db';

const VIA_CEP_BASE = 'https://viacep.com.br/ws';
const RATE_LIMIT_MS = 1100; // pouco mais de 1s entre chamadas
const MAX_PER_RUN = 200;

function cepNorm(cep: string | null): string | null {
  if (!cep || typeof cep !== 'string') return null;
  const digits = cep.replace(/\D/g, '').slice(0, 8);
  return digits.length === 8 ? digits : null;
}

async function ensureCacheTable(client: import('pg').PoolClient): Promise<void> {
  await client.query(`
    CREATE TABLE IF NOT EXISTS tbl_via_cep_cache (
      cep_norm TEXT PRIMARY KEY,
      logradouro TEXT,
      bairro TEXT,
      localidade TEXT,
      uf TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

export const maxDuration = 300; // 5 min para lotes grandes

export async function POST(request: NextRequest) {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }
  if (!requireAdmin(user)) {
    return NextResponse.json({ error: 'Acesso negado. Apenas administradores.' }, { status: 403 });
  }

  let limit = MAX_PER_RUN;
  try {
    const body = await request.json().catch(() => ({}));
    if (typeof body.limit === 'number' && body.limit > 0 && body.limit <= 500) {
      limit = body.limit;
    }
  } catch {
    // use default
  }

  const client = await pool.connect();
  try {
    await ensureCacheTable(client);

    // CEPs de famílias sem território que ainda não estão na tbl_geo
    const { rows: cepsToFetch } = await client.query<{ cep_norm: string }>(`
      SELECT DISTINCT f.d_num_cep_logradouro_fam AS cep_norm
      FROM mv_familias_limpa f
      WHERE f.d_num_cep_logradouro_fam IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM mv_familias_geo g WHERE g.d_cod_familiar_fam = f.d_cod_familiar_fam)
        AND NOT EXISTS (SELECT 1 FROM mv_familias_geo_por_logradouro g2 WHERE g2.d_cod_familiar_fam = f.d_cod_familiar_fam)
        AND NOT EXISTS (SELECT 1 FROM tbl_geo g0 WHERE g0.cep_norm = f.d_num_cep_logradouro_fam)
      LIMIT $1
    `, [limit]);

    let fromCache = 0;
    let insertedGeo = 0;
    const errors: string[] = [];

    for (let i = 0; i < cepsToFetch.length; i++) {
      const cep = cepsToFetch[i].cep_norm;
      const norm = cepNorm(cep);
      if (!norm) continue;

      // Já existe na Geo? (pode ter sido inserido em run anterior)
      const { rows: inGeo } = await client.query('SELECT 1 FROM tbl_geo WHERE cep_norm = $1 LIMIT 1', [norm]);
      if (inGeo.length > 0) continue;

      let logradouro: string | null = null;
      let bairro: string | null = null;
      let localidade: string | null = null;
      let uf: string | null = null;

      const { rows: cached } = await client.query<{ logradouro: string; bairro: string; localidade: string; uf: string }>(
        'SELECT logradouro, bairro, localidade, uf FROM tbl_via_cep_cache WHERE cep_norm = $1',
        [norm]
      );
      if (cached.length > 0) {
        fromCache++;
        logradouro = cached[0].logradouro;
        bairro = cached[0].bairro;
        localidade = cached[0].localidade;
        uf = cached[0].uf;
      } else {
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
          await client.query(
            `INSERT INTO tbl_via_cep_cache (cep_norm, logradouro, bairro, localidade, uf)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (cep_norm) DO UPDATE SET logradouro = EXCLUDED.logradouro, bairro = EXCLUDED.bairro, localidade = EXCLUDED.localidade, uf = EXCLUDED.uf`,
            [norm, logradouro, bairro, localidade, uf]
          );
        } catch (e) {
          errors.push(`CEP ${norm}: ${e instanceof Error ? e.message : String(e)}`);
          continue;
        }
      }

      if (logradouro || bairro) {
        const endereco = logradouro ?? '';
        const bairroVal = bairro ?? null;
        const cepFormatted = norm.length === 8 ? `${norm.slice(0, 5)}-${norm.slice(5)}` : norm;
        await client.query(
          `INSERT INTO tbl_geo (endereco, bairro, cep, cep_norm) VALUES ($1, $2, $3, $4)`,
          [endereco, bairroVal, cepFormatted, norm]
        );
        insertedGeo++;
      }
    }

    return NextResponse.json({
      ok: true,
      message: `Enriquecimento Via CEP: ${cepsToFetch.length} CEP(s) processados, ${fromCache} do cache, ${insertedGeo} inseridos na Geo. Execute "Atualizar match Geo" para aplicar.`,
      processed: cepsToFetch.length,
      from_cache: fromCache,
      inserted_geo: insertedGeo,
      errors: errors.length ? errors.slice(0, 20) : undefined,
    });
  } catch (e) {
    console.error('via-cep-enrich', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Erro ao enriquecer.' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
