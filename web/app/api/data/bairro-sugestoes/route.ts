import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { query } from '@/lib/db';

const MAX = 50;

/**
 * GET /api/data/bairro-sugestoes?q=...
 * Retorna bairros (d_nom_unidade_territorial_fam) que contêm o texto (ILIKE). Para autocomplete.
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

  try {
    const { rows } = await query<{ nome: string }>(
      `SELECT DISTINCT NULLIF(TRIM(d_nom_unidade_territorial_fam), '') AS nome
       FROM vw_familias_limpa
       WHERE d_nom_unidade_territorial_fam IS NOT NULL AND TRIM(d_nom_unidade_territorial_fam) ILIKE $1
       ORDER BY nome
       LIMIT ${MAX}`,
      [`%${q}%`]
    );

    const bairros = rows.filter((r) => r.nome != null).map((r) => String(r.nome));

    return NextResponse.json({ bairros });
  } catch (e) {
    console.error('Bairro sugestoes error:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Erro ao buscar bairros.' },
      { status: 500 }
    );
  }
}
