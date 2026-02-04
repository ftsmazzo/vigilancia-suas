import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { query } from '@/lib/db';

/**
 * GET /api/data/cras-opcoes
 * Retorna CRAS: prioriza cras_territorio (Geo), depois extrai de d_nom_centro_assist_fam.
 */
export async function GET() {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }

  try {
    let rows: { nome: string }[] = [];

    const { rows: rowsGeo } = await query<{ nome: string }>(
      `SELECT DISTINCT NULLIF(TRIM(cras_territorio::TEXT), '') AS nome
       FROM vw_familias_territorio
       WHERE cras_territorio IS NOT NULL
       ORDER BY nome`
    );
    rows = rowsGeo.filter((r) => r.nome != null && String(r.nome).trim() !== '');

    if (rows.length === 0) {
      const { rows: rowsStrict } = await query<{ nome: string }>(
        `SELECT DISTINCT
           regexp_replace(trim((regexp_matches(d_nom_centro_assist_fam, 'CRAS\s*\d+', 'i'))[1]), '\s+', ' ', 'g') AS nome
         FROM vw_familias_territorio
         WHERE d_nom_centro_assist_fam IS NOT NULL
           AND trim(d_nom_centro_assist_fam) ~* 'CRAS\s*\d+'
           AND trim(d_nom_centro_assist_fam) !~* 'CREAS'
         ORDER BY nome`
      );
      rows = rowsStrict.filter((r) => r.nome != null && String(r.nome).trim() !== '');
    }
    if (rows.length === 0) {
      const { rows: rowsFallback } = await query<{ nome: string }>(
        `SELECT DISTINCT NULLIF(trim(d_nom_centro_assist_fam), '') AS nome
         FROM vw_familias_territorio
         WHERE d_nom_centro_assist_fam IS NOT NULL
           AND trim(d_nom_centro_assist_fam) ILIKE '%CRAS%'
           AND trim(d_nom_centro_assist_fam) NOT ILIKE '%CREAS%'
         ORDER BY nome
         LIMIT 30`
      );
      rows = rowsFallback.filter((r) => r.nome != null && String(r.nome).trim() !== '');
    }

    const opcoes = rows.map((r) => ({ nome: String(r.nome).trim(), cod: String(r.nome).trim() }));

    return NextResponse.json({ opcoes });
  } catch (e) {
    console.error('CRAS opcoes error:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Erro ao carregar CRAS.' },
      { status: 500 }
    );
  }
}
