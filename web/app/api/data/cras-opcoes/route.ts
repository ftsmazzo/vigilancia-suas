import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { query } from '@/lib/db';

/**
 * GET /api/data/cras-opcoes
 * Retorna apenas CRAS 1, CRAS 2, CRAS 3, etc. (extrai do campo; exclui CREAS, POP e outros).
 */
export async function GET() {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }

  try {
    const { rows } = await query<{ nome: string }>(
      `SELECT DISTINCT
         regexp_replace(trim((regexp_matches(d_nom_centro_assist_fam, 'CRAS\s*\d+', 'i'))[1]), '\s+', ' ', 'g') AS nome
       FROM vw_familias_limpa
       WHERE d_nom_centro_assist_fam IS NOT NULL
         AND trim(d_nom_centro_assist_fam) ~* 'CRAS\s*\d+'
         AND trim(d_nom_centro_assist_fam) !~* 'CREAS'
       ORDER BY nome`
    );

    const opcoes = rows
      .filter((r) => r.nome != null && String(r.nome).trim() !== '')
      .map((r) => ({ nome: String(r.nome).trim(), cod: String(r.nome).trim() }));

    return NextResponse.json({ opcoes });
  } catch (e) {
    console.error('CRAS opcoes error:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Erro ao carregar CRAS.' },
      { status: 500 }
    );
  }
}
