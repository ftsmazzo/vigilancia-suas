/**
 * POST /api/admin/create/[script]
 * Executa o script SQL embutido para criar/recriar views e MVs.
 * Funciona após deploy (Docker, etc.) sem depender de arquivos .sql no disco.
 * script: views-cadu | mv-familias-limpa | folha-rf | familia-cpf-visitas
 * Ordem recomendada: views-cadu → mv-familias-limpa → (Geo na página Geo) → folha-rf → familia-cpf-visitas
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import pool from '@/lib/db';
import {
  SQL_VIEWS_CADU,
  SQL_MV_FAMILIAS_LIMPA,
  SQL_FOLHA_RF,
  SQL_FAMILIA_CPF_VISITAS,
} from '@/lib/sql-scripts';

const SCRIPTS: Record<string, string> = {
  'views-cadu': SQL_VIEWS_CADU,
  'mv-familias-limpa': SQL_MV_FAMILIAS_LIMPA,
  'folha-rf': SQL_FOLHA_RF,
  'familia-cpf-visitas': SQL_FAMILIA_CPF_VISITAS,
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ script: string }> }
) {
  const user = await getSession();
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }

  const { script } = await params;
  const sql = SCRIPTS[script];
  if (!sql) {
    return NextResponse.json(
      { error: `Script inválido. Use: ${Object.keys(SCRIPTS).join(', ')}` },
      { status: 400 }
    );
  }

  const trimmed = sql.trim();
  if (!trimmed) {
    return NextResponse.json({ error: 'Script vazio.' }, { status: 400 });
  }

  const client = await pool.connect();
  try {
    await client.query("SET statement_timeout = '1800000'"); // 30 min por script
    await client.query(trimmed);
    return NextResponse.json({
      ok: true,
      message: `${script} executado com sucesso.`,
    });
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    console.error(`Create script ${script} error:`, error);
    return NextResponse.json(
      { error: `Erro ao executar ${script}: ${error}` },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
