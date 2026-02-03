import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { query } from '@/lib/db';

/**
 * Lista views e tabelas principais para a área de consulta.
 */
export async function GET() {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }

  try {
    const { rows } = await query<{ table_name: string; table_type: string }>(
      `SELECT table_name, table_type
       FROM information_schema.tables
       WHERE table_schema = 'public'
         AND (table_type = 'VIEW' OR table_type = 'BASE TABLE')
         AND table_name IN (
           'cadu_raw', 'vw_familias_limpa', 'vw_pessoas_limpa',
           'vw_folha_rf', 'vw_filtro_controle', 'vw_cpf_situacao',
           'sibec_folha_pagamento', 'sibec_bloqueados', 'sibec_cancelados',
           'visitas_raw'
         )
       ORDER BY table_type, table_name`
    );

    const views = (rows || []).map((r) => ({
      name: r.table_name,
      type: r.table_type,
    }));

    return NextResponse.json({ views });
  } catch (e) {
    console.error('List views error:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Erro ao listar views.' },
      { status: 500 }
    );
  }
}
