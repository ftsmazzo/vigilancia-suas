/**
 * POST /api/admin/geo/via-cep-to-geo
 * Passo 2: Copia da tabela intermediária tbl_via_cep para tbl_geo (só CEPs que ainda não estão na Geo).
 * Depois rode "Atualizar match Geo".
 */

import { NextResponse } from 'next/server';
import { getSession, requireAdmin } from '@/lib/auth';
import pool from '@/lib/db';

export async function POST() {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }
  if (!requireAdmin(user)) {
    return NextResponse.json({ error: 'Acesso negado. Apenas administradores.' }, { status: 403 });
  }

  const client = await pool.connect();
  try {
    const { rowCount } = await client.query(`
      INSERT INTO tbl_geo (endereco, bairro, cep, cep_norm)
      SELECT
        COALESCE(v.logradouro, ''),
        v.bairro,
        CASE WHEN LENGTH(v.cep_norm) = 8 THEN SUBSTRING(v.cep_norm FROM 1 FOR 5) || '-' || SUBSTRING(v.cep_norm FROM 6 FOR 3) ELSE v.cep_norm END,
        v.cep_norm
      FROM tbl_via_cep v
      WHERE NOT EXISTS (SELECT 1 FROM tbl_geo g WHERE g.cep_norm = v.cep_norm)
    `);

    const inserted = rowCount ?? 0;
    return NextResponse.json({
      ok: true,
      message: inserted > 0
        ? `${inserted} registro(s) copiados de tbl_via_cep para tbl_geo. Rode "Atualizar match Geo".`
        : 'Nenhum registro novo; todos os CEPs da tbl_via_cep já existem na tbl_geo.',
      inserted_geo: inserted,
    });
  } catch (e) {
    console.error('via-cep-to-geo', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Erro ao copiar para Geo.' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
