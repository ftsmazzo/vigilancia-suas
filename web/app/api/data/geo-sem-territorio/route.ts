import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { query } from '@/lib/db';

/**
 * GET /api/data/geo-sem-territorio
 * Lista famílias que não deram match na Geo (sem território).
 * Para revisão: corrigir no cadastro, enriquecer a base Geo ou incluir na tbl_geo.
 */
export async function GET() {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }

  const sql = `
SELECT
  f.d_cod_familiar_fam AS cod_familiar,
  f.d_num_cep_logradouro_fam AS cep,
  TRIM(CONCAT_WS(' ',
    NULLIF(TRIM(COALESCE(f.d_nom_tip_logradouro_fam, '')), ''),
    NULLIF(TRIM(COALESCE(f.d_nom_titulo_logradouro_fam, '')), ''),
    NULLIF(TRIM(COALESCE(f.d_nom_logradouro_fam, '')), ''),
    NULLIF(TRIM(COALESCE(f.d_num_logradouro_fam, '')), '')
  )) AS endereco,
  f.d_nom_unidade_territorial_fam AS bairro
FROM mv_familias_limpa f
WHERE NOT EXISTS (SELECT 1 FROM mv_familias_geo g WHERE g.d_cod_familiar_fam = f.d_cod_familiar_fam)
  AND NOT EXISTS (SELECT 1 FROM mv_familias_geo_por_logradouro g2 WHERE g2.d_cod_familiar_fam = f.d_cod_familiar_fam)
ORDER BY f.d_num_cep_logradouro_fam NULLS LAST, f.d_nom_logradouro_fam
`;

  try {
    const { rows } = await query<{ cod_familiar: string; cep: string; endereco: string; bairro: string }>(sql);
    return NextResponse.json({ total: rows.length, rows });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes('does not exist')) {
      return NextResponse.json(
        { error: 'MVs de Geo ainda não existem. Execute "Criar/recriar mv_familias_geo" e "Atualizar match Geo".' },
        { status: 400 }
      );
    }
    console.error('geo-sem-territorio', e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
