import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { query } from '@/lib/db';

/**
 * GET /api/data/analise-cep-logradouro-24m
 * Análise: entre famílias com data de atualização nos últimos 24 meses,
 * quantas têm CEP que existe na Geo e quantas têm endereço coincidente vs divergente.
 * Requer norm_logradouro_para_match, vw_familias_limpa, tbl_geo.
 */
export async function GET() {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }

  const sql = `
WITH fam_24m AS (
  SELECT
    f.d_cod_familiar_fam,
    f.d_num_cep_logradouro_fam,
    norm_logradouro_para_match(CONCAT_WS(' ',
      NULLIF(TRIM(COALESCE(f.d_nom_tip_logradouro_fam, '')), ''),
      NULLIF(TRIM(COALESCE(f.d_nom_titulo_logradouro_fam, '')), ''),
      NULLIF(TRIM(COALESCE(f.d_nom_logradouro_fam, '')), '')
    )) AS logradouro_cadu_norm
  FROM vw_familias_limpa f
  WHERE f.d_dat_atual_fam IS NOT NULL
    AND (CURRENT_DATE - f.d_dat_atual_fam)::INTEGER <= 730
),
fam_com_cep AS (
  SELECT * FROM fam_24m
  WHERE d_num_cep_logradouro_fam IS NOT NULL
),
match_por_cep AS (
  SELECT
    f.d_cod_familiar_fam,
    MAX(CASE
      WHEN f.logradouro_cadu_norm = norm_logradouro_para_match(g.endereco)
      THEN 1 ELSE 0
    END) AS endereco_coincide
  FROM fam_com_cep f
  INNER JOIN tbl_geo g
    ON g.cep_norm = f.d_num_cep_logradouro_fam
    AND g.cep_norm IS NOT NULL
  GROUP BY f.d_cod_familiar_fam
)
SELECT
  (SELECT COUNT(*) FROM vw_familias_limpa) AS total_familias_cadastro,
  (SELECT COUNT(*) FROM fam_24m) AS total_familias_24m,
  (SELECT COUNT(*) FROM fam_com_cep) AS com_cep_preenchido_24m,
  (SELECT COUNT(*) FROM match_por_cep) AS cep_existe_na_geo_24m,
  (SELECT COUNT(*) FROM match_por_cep WHERE endereco_coincide = 1) AS endereco_coincide_24m,
  (SELECT COUNT(*) FROM match_por_cep WHERE endereco_coincide = 0) AS endereco_divergente_24m
`;

  try {
    const { rows } = await query<{
      total_familias_cadastro: string;
      total_familias_24m: string;
      com_cep_preenchido_24m: string;
      cep_existe_na_geo_24m: string;
      endereco_coincide_24m: string;
      endereco_divergente_24m: string;
    }>(sql);

    const row = rows[0];
    if (!row) {
      return NextResponse.json({
        error: 'Nenhum resultado (verifique se norm_logradouro_para_match, vw_familias_limpa e tbl_geo existem).',
      }, { status: 500 });
    }

    return NextResponse.json({
      total_familias_cadastro: Number(row.total_familias_cadastro),
      total_familias_24m: Number(row.total_familias_24m),
      com_cep_preenchido_24m: Number(row.com_cep_preenchido_24m),
      cep_existe_na_geo_24m: Number(row.cep_existe_na_geo_24m),
      endereco_coincide_24m: Number(row.endereco_coincide_24m),
      endereco_divergente_24m: Number(row.endereco_divergente_24m),
    });
  } catch (e) {
    console.error('analise-cep-logradouro-24m', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Erro ao executar análise.' },
      { status: 500 }
    );
  }
}
