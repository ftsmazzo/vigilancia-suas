import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { query } from '@/lib/db';

/**
 * GET /api/data/ceps-mapa-bairros
 * Lista bairros distintos da tbl_ceps (para filtro no mapa).
 */
export async function GET() {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }

  try {
    const { rows } = await query<{ bairro: string | null }>(
      `SELECT DISTINCT NULLIF(TRIM(bairro), '') AS bairro
       FROM tbl_ceps
       WHERE bairro IS NOT NULL AND TRIM(bairro) != ''
       ORDER BY bairro`
    );

    const bairros = rows
      .map((r) => r.bairro)
      .filter((b): b is string => b != null && b !== '');

    return NextResponse.json({ bairros });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes('does not exist') || msg.includes('não existe')) {
      return NextResponse.json({ bairros: [], error: 'Tabela tbl_ceps não existe.' });
    }
    console.error('ceps-mapa-bairros', e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
