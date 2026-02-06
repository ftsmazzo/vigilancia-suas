import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { query } from '@/lib/db';

/**
 * GET /api/data/geo-match-stats
 * Contagens reais do resultado do match Geo (MVs e vw_familias_territorio).
 * Use para "ver o resultado" após "Atualizar match Geo".
 */
export async function GET() {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }

  const sql = `
SELECT
  (SELECT COUNT(*) FROM mv_familias_geo) AS total_mv_familias_geo,
  (SELECT COUNT(*) FROM mv_familias_geo_por_logradouro) AS total_mv_familias_geo_por_logradouro,
  (SELECT COUNT(*) FROM vw_familias_territorio WHERE cep_territorio IS NOT NULL) AS total_com_territorio,
  (SELECT COUNT(*) FROM mv_familias_limpa) AS total_familias_cadastro
`;

  try {
    const { rows } = await query<{
      total_mv_familias_geo: string;
      total_mv_familias_geo_por_logradouro: string;
      total_com_territorio: string;
      total_familias_cadastro: string;
    }>(sql);

    const row = rows[0];
    if (!row) {
      return NextResponse.json({
        error: 'Nenhum resultado.',
      }, { status: 500 });
    }

    return NextResponse.json({
      total_mv_familias_geo: Number(row.total_mv_familias_geo),
      total_mv_familias_geo_por_logradouro: Number(row.total_mv_familias_geo_por_logradouro),
      total_com_territorio: Number(row.total_com_territorio),
      total_familias_cadastro: Number(row.total_familias_cadastro),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes('does not exist') || msg.includes('não existe')) {
      return NextResponse.json({
        error: 'MVs de Geo ainda não existem. Execute "Criar/recriar mv_familias_geo" ou rode create_geo_match_step1 e step2 no PGAdmin.',
        total_mv_familias_geo: null,
        total_mv_familias_geo_por_logradouro: null,
        total_com_territorio: null,
        total_familias_cadastro: null,
      }); // 200 para a UI exibir a mensagem
    }
    console.error('geo-match-stats', e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
