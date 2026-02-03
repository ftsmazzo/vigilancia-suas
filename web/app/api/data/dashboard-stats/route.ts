import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { query } from '@/lib/db';

/** Colunas de família (vw_familias_limpa) permitidas para filtro (múltiplos valores = IN). */
const FAM_COLUMNS = new Set([
  'd_fx_rfpc',
  'd_cod_local_domic_fam',
  'd_cod_est_cadastral_fam',
  'd_cod_forma_coleta_fam',
  'd_cod_familia_indigena_fam',
  'd_cod_indigena_reside_fam',
]);
/** Colunas de pessoa (vw_pessoas_limpa) permitidas para filtro (múltiplos valores = IN). */
const PESSOA_COLUMNS = new Set([
  'p_cod_sexo_pessoa',
  'p_cod_raca_cor_pessoa',
  'p_grau_instrucao',
  'p_fx_idade',
  'p_cod_parentesco_rf_pessoa',
]);
/** Filtros de texto em família: ILIKE. */
const FAM_TEXT_FILTERS: Record<string, string> = {
  cras: 'd_nom_centro_assist_fam',
  bairro: 'd_nom_unidade_territorial_fam',
};

function getMultiValues(searchParams: URLSearchParams, key: string): string[] {
  const raw = searchParams.getAll(key).flatMap((v) => v.split(',').map((s) => s.trim()).filter(Boolean));
  return Array.from(new Set(raw));
}

/**
 * GET /api/data/dashboard-stats
 * Totais de famílias e pessoas cruzados por código familiar (d_cd_ibge + d_cod_familiar_fam).
 * Múltiplos valores por filtro: d_fx_rfpc=1&d_fx_rfpc=2.
 * cras e bairro: texto (ILIKE). Famílias e pessoas sempre consistentes (mesmo universo).
 */
export async function GET(request: NextRequest) {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);

  const famMulti: { col: string; vals: string[] }[] = [];
  const pessoaMulti: { col: string; vals: string[] }[] = [];
  const famText: { col: string; param: string; val: string }[] = [];
  let paramIndex = 1;

  for (const key of Array.from(FAM_COLUMNS)) {
    const vals = getMultiValues(searchParams, key);
    if (vals.length > 0) famMulti.push({ col: key, vals });
  }
  for (const key of Array.from(PESSOA_COLUMNS)) {
    const vals = getMultiValues(searchParams, key);
    if (vals.length > 0) pessoaMulti.push({ col: key, vals });
  }
  for (const [param, col] of Object.entries(FAM_TEXT_FILTERS)) {
    const val = searchParams.get(param)?.trim();
    if (val) famText.push({ col, param, val });
  }

  const famConditions: string[] = [];
  const famParams: unknown[] = [];
  for (const f of famMulti) {
    const placeholders = f.vals.map(() => `$${paramIndex++}`).join(', ');
    famConditions.push(`f.${f.col}::TEXT IN (${placeholders})`);
    famParams.push(...f.vals);
  }
  for (const ft of famText) {
    famConditions.push(`(f.${ft.col} IS NOT NULL AND f.${ft.col}::TEXT ILIKE $${paramIndex})`);
    famParams.push(`%${ft.val}%`);
    paramIndex++;
  }

  const pessoaConditions: string[] = [];
  const pessoaParams: unknown[] = [];
  for (const p of pessoaMulti) {
    const placeholders = p.vals.map(() => `$${paramIndex++}`).join(', ');
    pessoaConditions.push(`p.${p.col}::TEXT IN (${placeholders})`);
    pessoaParams.push(...p.vals);
  }

  const join = 'f.d_cd_ibge = p.d_cd_ibge AND f.d_cod_familiar_fam = p.d_cod_familiar_fam';
  const hasFamFilters = famConditions.length > 0;
  const hasPessoaFilters = pessoaConditions.length > 0;

  try {
    let totalFamilias: number;
    if (hasPessoaFilters) {
      const allConditions = [...famConditions, ...pessoaConditions];
      const allParams = [...famParams, ...pessoaParams];
      const whereClause = `WHERE ${allConditions.join(' AND ')}`;
      const sqlFam =
        `SELECT COUNT(*) AS c FROM (` +
        `SELECT DISTINCT f.d_cd_ibge, f.d_cod_familiar_fam FROM vw_familias_limpa f ` +
        `INNER JOIN vw_pessoas_limpa p ON ${join} ${whereClause}` +
        `) t`;
      const resFam = await query<{ c: string }>(sqlFam, allParams);
      totalFamilias = parseInt(resFam.rows[0]?.c ?? '0', 10);
    } else {
      const whereFam = hasFamFilters ? `WHERE ${famConditions.join(' AND ')}` : '';
      const sqlFam = `SELECT COUNT(*) AS c FROM vw_familias_limpa f ${whereFam}`;
      const resFam = await query<{ c: string }>(sqlFam, famParams);
      totalFamilias = parseInt(resFam.rows[0]?.c ?? '0', 10);
    }

    let totalPessoas: number;
    if (hasFamFilters || hasPessoaFilters) {
      const allConditions = [...famConditions, ...pessoaConditions];
      const allParams = [...famParams, ...pessoaParams];
      const whereClause = allConditions.length ? `WHERE ${allConditions.join(' AND ')}` : '';
      const sqlPessoa =
        `SELECT COUNT(*) AS c FROM vw_pessoas_limpa p ` +
        `INNER JOIN vw_familias_limpa f ON ${join} ${whereClause}`;
      const resPessoa = await query<{ c: string }>(sqlPessoa, allParams);
      totalPessoas = parseInt(resPessoa.rows[0]?.c ?? '0', 10);
    } else {
      const resPessoa = await query<{ c: string }>(`SELECT COUNT(*) AS c FROM vw_pessoas_limpa p`, []);
      totalPessoas = parseInt(resPessoa.rows[0]?.c ?? '0', 10);
    }

    const totalFilterParams =
      famParams.length + pessoaParams.length + famText.length;

    return NextResponse.json({
      totalFamilias,
      totalPessoas,
      filtros: totalFilterParams,
    });
  } catch (e) {
    console.error('Dashboard stats error:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Erro ao calcular totais.' },
      { status: 500 }
    );
  }
}
