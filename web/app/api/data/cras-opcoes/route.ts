import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { query } from '@/lib/db';

/**
 * GET /api/data/cras-opcoes
 * Retorna lista de CRAS de referência (d_nom_centro_assist_fam) para filtro na dashboard.
 */
export async function GET() {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }

  try {
    const { rows } = await query<{ nome: string; cod: string }>(
      `SELECT DISTINCT NULLIF(TRIM(d_nom_centro_assist_fam), '') AS nome, NULLIF(TRIM(d_cod_centro_assist_fam), '') AS cod
       FROM vw_familias_limpa
       WHERE NULLIF(TRIM(d_nom_centro_assist_fam), '') IS NOT NULL
       ORDER BY nome`
    );

    const opcoes = rows
      .filter((r) => r.nome != null)
      .map((r) => ({ nome: String(r.nome), cod: r.cod != null ? String(r.cod) : String(r.nome) }));

    return NextResponse.json({ opcoes });
  } catch (e) {
    console.error('CRAS opcoes error:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Erro ao carregar CRAS.' },
      { status: 500 }
    );
  }
}
