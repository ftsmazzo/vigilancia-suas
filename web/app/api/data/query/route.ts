import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { query } from '@/lib/db';

const MAX_ROWS = 500;
const ALLOWED_TABLES = new Set([
  'cadu_raw', 'vw_familias_limpa', 'vw_pessoas_limpa', 'vw_folha_rf',
  'vw_filtro_controle', 'vw_cpf_situacao', 'sibec_folha_pagamento',
  'sibec_bloqueados', 'sibec_cancelados', 'visitas_raw',
]);

/**
 * Consulta read-only com limite. Aceita table name e opcional limit/offset.
 */
export async function GET(request: NextRequest) {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const table = searchParams.get('table');
  const limit = Math.min(Number(searchParams.get('limit')) || 100, MAX_ROWS);
  const offset = Math.max(0, Number(searchParams.get('offset')) || 0);

  if (!table || !ALLOWED_TABLES.has(table)) {
    return NextResponse.json(
      { error: 'Tabela não permitida ou não informada.' },
      { status: 400 }
    );
  }

  try {
    const safeTable = `"${table.replace(/"/g, '""')}"`;
    const { rows } = await query<Record<string, unknown>>(
      `SELECT * FROM ${safeTable} LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    const countResult = await query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM ${safeTable}`,
      []
    );
    const total = parseInt(countResult.rows[0]?.count ?? '0', 10);

    return NextResponse.json({
      table,
      rows,
      total,
      limit,
      offset,
    });
  } catch (e) {
    console.error('Query error:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Erro na consulta.' },
      { status: 500 }
    );
  }
}
