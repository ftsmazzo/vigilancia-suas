import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { query } from '@/lib/db';

const MAX_ROWS = 500;
const DEFAULT_LIMIT = 100;

/** Campos permitidos para filtro (evita SQL injection) */
const FILTER_COLUMNS: Record<string, string> = {
  bairro: 'bairro',
  situacao_familia: 'situacao_familia',
  ja_teve_visita: 'ja_teve_visita',
  ainda_precisa_visita: 'ainda_precisa_visita',
  tipo_atendimento: 'tipo_atendimento',
  local_atendimento: 'local_atendimento',
  atendente: 'atendente',
};

/**
 * GET /api/data/agenda-forms
 * Consulta vw_filtro_controle com filtros opcionais.
 * Query params: limit, offset, e qualquer chave de FILTER_COLUMNS (valor = filtro ILIKE ou exato).
 */
export async function GET(request: NextRequest) {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(Number(searchParams.get('limit')) || DEFAULT_LIMIT, MAX_ROWS);
  const offset = Math.max(0, Number(searchParams.get('offset')) || 0);

  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  for (const [key, col] of Object.entries(FILTER_COLUMNS)) {
    const value = searchParams.get(key)?.trim();
    if (!value) continue;
    conditions.push(`NULLIF(TRIM(${col}), '') ILIKE $${paramIndex}`);
    params.push(`%${value}%`);
    paramIndex++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  try {
    const sql = `
      SELECT * FROM vw_filtro_controle
      ${whereClause}
      ORDER BY id
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    params.push(limit, offset);

    const { rows } = await query<Record<string, unknown>>(sql.trim(), params);

    const countSql = `
      SELECT COUNT(*) AS count FROM vw_filtro_controle
      ${whereClause}
    `;
    const countResult = await query<{ count: string }>(countSql.trim(), params.slice(0, -2));
    const total = parseInt(countResult.rows[0]?.count ?? '0', 10);

    return NextResponse.json({
      table: 'vw_filtro_controle',
      rows,
      total,
      limit,
      offset,
    });
  } catch (e) {
    console.error('Agenda forms query error:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Erro na consulta.' },
      { status: 500 }
    );
  }
}
