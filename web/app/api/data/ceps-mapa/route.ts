import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { query } from '@/lib/db';

/**
 * GET /api/data/ceps-mapa
 * Pontos para o mapa: um por CEP, a partir da base de endereços (tbl_geo).
 * Georreferência por CEP: cada CEP aparece uma vez com lat/long.
 * Query params: limite (default 3000).
 */
export async function GET(request: Request) {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const limite = Math.min(Math.max(Number(searchParams.get('limite')) || 3000, 1), 10000);

  const sql = `
    SELECT
      cep,
      endereco,
      bairro,
      lat_num AS lat,
      long_num AS lng
    FROM (
      SELECT DISTINCT ON (COALESCE(cep_norm, cep))
        cep,
        endereco,
        bairro,
        lat_num,
        long_num,
        cep_norm
      FROM tbl_geo
      WHERE lat_num IS NOT NULL AND long_num IS NOT NULL
      ORDER BY COALESCE(cep_norm, cep), id
    ) sub
    ORDER BY cep
    LIMIT $1
  `;

  try {
    const { rows } = await query<{
      cep: string | null;
      endereco: string | null;
      bairro: string | null;
      lat: number;
      lng: number;
    }>(sql, [limite]);

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
        error: 'Tabela tbl_geo não existe. Faça o upload da base Geo primeiro.',
      });
    }
    console.error('ceps-mapa', e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
