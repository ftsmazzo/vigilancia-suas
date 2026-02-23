import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { query } from '@/lib/db';

/**
 * GET /api/data/ceps-mapa
 * Pontos para o mapa: um por CEP, a partir da base tbl_ceps.
 * Query params: limite (default 3000), bairro (opcional, filtra por bairro).
 */
export async function GET(request: Request) {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const limite = Math.min(Math.max(Number(searchParams.get('limite')) || 3000, 1), 10000);
  const bairro = searchParams.get('bairro')?.trim() || null;

  // tbl_ceps: cep, endereco, bairro; assumindo lat_num, long_num (como tbl_geo)
  const sql = `
    SELECT
      sub.cep,
      sub.endereco,
      sub.bairro,
      sub.lat_num AS lat,
      sub.long_num AS lng
    FROM (
      SELECT DISTINCT ON (cep)
        cep,
        endereco,
        bairro,
        lat_num,
        long_num
      FROM tbl_ceps
      WHERE lat_num IS NOT NULL AND long_num IS NOT NULL
      ${bairro ? 'AND TRIM(COALESCE(bairro, \'\')) = $2' : ''}
      ORDER BY cep, endereco
    ) sub
    ORDER BY cep
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
        error: 'Tabela tbl_ceps não existe ou não tem colunas lat_num/long_num. Crie tbl_ceps ou use uma view com essas colunas.',
      });
    }
    console.error('ceps-mapa', e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
