import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { query } from '@/lib/db';

/**
 * GET /api/data/ceps-mapa
 * Pontos para o mapa: um por CEP da tbl_ceps (lat/long do banco: lat_char, long_char).
 * Query params: limite (default 3000), bairro (opcional).
 */
export async function GET(request: Request) {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const limite = Math.min(Math.max(Number(searchParams.get('limite')) || 3000, 1), 10000);
  const bairro = searchParams.get('bairro')?.trim() || null;

  const sql = `
    SELECT
      sub.cep,
      sub.endereco,
      sub.bairro,
      sub.lat,
      sub.lng
    FROM (
      SELECT DISTINCT ON (cep)
        cep,
        endereco,
        bairro,
        CASE WHEN NULLIF(TRIM(lat_char), '') ~ '^-?[\\d.]+$' THEN TRIM(lat_char)::DOUBLE PRECISION ELSE NULL END AS lat,
        CASE WHEN NULLIF(TRIM(long_char), '') ~ '^-?[\\d.]+$' THEN TRIM(long_char)::DOUBLE PRECISION ELSE NULL END AS lng
      FROM tbl_ceps
      WHERE lat_char IS NOT NULL AND long_char IS NOT NULL
        AND TRIM(COALESCE(lat_char, '')) != '' AND TRIM(COALESCE(long_char, '')) != ''
        AND TRIM(lat_char) ~ '^-?[\\d.]+$' AND TRIM(long_char) ~ '^-?[\\d.]+$'
      ${bairro ? 'AND TRIM(COALESCE(bairro, \'\')) = $2' : ''}
      ORDER BY cep, endereco
    ) sub
    WHERE sub.lat IS NOT NULL AND sub.lng IS NOT NULL
    ORDER BY sub.cep
    LIMIT $1
  `;
  const params = bairro ? [limite, bairro] : [limite];

  try {
    const { rows } = await query<{
      cep: string | null;
      endereco: string | null;
      bairro: string | null;
      lat: number;
      lng: number;
    }>(sql, params);

    return NextResponse.json({
      pontos: rows.map((r) => ({
        cep: r.cep ?? '',
        endereco: r.endereco ?? '',
        bairro: r.bairro ?? '',
        lat: Number(r.lat),
        lng: Number(r.lng),
      })),
      total: rows.length,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes('does not exist') || msg.includes('não existe')) {
      return NextResponse.json({
        pontos: [],
        total: 0,
        error: 'Tabela tbl_ceps não existe.',
      });
    }
    console.error('ceps-mapa', e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
