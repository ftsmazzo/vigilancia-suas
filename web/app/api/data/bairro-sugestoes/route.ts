import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { query } from '@/lib/db';

const MAX = 50;

/**
 * GET /api/data/bairro-sugestoes?q=...
 * Retorna bairros que contêm o texto: busca em d_nom_unidade_territorial_fam e d_nom_localidade_fam.
 */
export async function GET(request: NextRequest) {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }

  const q = request.nextUrl.searchParams.get('q')?.trim() ?? '';
  if (q.length < 2) {
    return NextResponse.json({ bairros: [] });
  }

  const pattern = `%${q}%`;

  try {
    const { rows } = await query<{ nome: string }>(
      `SELECT DISTINCT nome FROM (
         SELECT NULLIF(TRIM(d_nom_unidade_territorial_fam), '') AS nome
         FROM vw_familias_limpa
         WHERE d_nom_unidade_territorial_fam IS NOT NULL AND TRIM(d_nom_unidade_territorial_fam) ILIKE $1
         UNION
         SELECT NULLIF(TRIM(d_nom_localidade_fam), '') AS nome
         FROM vw_familias_limpa
         WHERE d_nom_localidade_fam IS NOT NULL AND TRIM(d_nom_localidade_fam) ILIKE $1
       ) t
       WHERE nome IS NOT NULL AND nome != ''
       ORDER BY nome
       LIMIT ${MAX}`,
      [pattern]
    );

    const bairros = rows.map((r) => String(r.nome));

    return NextResponse.json({ bairros });
  } catch (e) {
    console.error('Bairro sugestoes error:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Erro ao buscar bairros.' },
      { status: 500 }
    );
  }
}
