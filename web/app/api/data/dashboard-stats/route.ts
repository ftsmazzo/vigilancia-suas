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
/** CRAS: múltiplos valores, match exato no nome (d_nom_centro_assist_fam IN (...)). */
const CRAS_COL = 'd_nom_centro_assist_fam';
/** Bairro: um valor, ILIKE em unidade territorial ou localidade. */
const BAIRRO_COLS = ['d_nom_unidade_territorial_fam', 'd_nom_localidade_fam'] as const;

/** Prazo de atualização cadastral: dias desde d_dat_atual_fam (dinâmico a partir de hoje). */
const PRAZO_ATUALIZACAO_DAYS: Record<string, { min?: number; max?: number }> = {
  ate_12: { max: 365 },
  '12_24': { min: 365, max: 730 },
  '24_48': { min: 730, max: 1460 },
  mais_48: { min: 1460 },
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
  const crasVals = getMultiValues(searchParams, 'cras');
  const bairroVal = searchParams.get('bairro')?.trim() ?? '';
  const prazoVal = searchParams.get('prazo_atualizacao')?.trim() ?? '';

  let paramIndex = 1;

  for (const key of Array.from(FAM_COLUMNS)) {
    const vals = getMultiValues(searchParams, key);
    if (vals.length > 0) famMulti.push({ col: key, vals });
  }
  for (const key of Array.from(PESSOA_COLUMNS)) {
    const vals = getMultiValues(searchParams, key);
    if (vals.length > 0) pessoaMulti.push({ col: key, vals });
  }

  const famConditions: string[] = [];
  const famParams: unknown[] = [];
  for (const f of famMulti) {
    const placeholders = f.vals.map(() => `$${paramIndex++}`).join(', ');
    famConditions.push(`f.${f.col}::TEXT IN (${placeholders})`);
    famParams.push(...f.vals);
  }
  if (crasVals.length > 0) {
    const orCras = crasVals.map(() => `(f.${CRAS_COL} IS NOT NULL AND f.${CRAS_COL}::TEXT ILIKE $${paramIndex++})`).join(' OR ');
    famConditions.push(`(${orCras})`);
    famParams.push(...crasVals.map((v) => `%${v}%`));
  }
  if (bairroVal) {
    const bairroPattern = `%${bairroVal}%`;
    const bairroOr = BAIRRO_COLS.map(
      (col) => `(f.${col} IS NOT NULL AND f.${col}::TEXT ILIKE $${paramIndex})`
    ).join(' OR ');
    famConditions.push(`(${bairroOr})`);
    famParams.push(bairroPattern);
    paramIndex++;
  }

  const prazoRange = prazoVal ? PRAZO_ATUALIZACAO_DAYS[prazoVal] : null;
  if (prazoRange) {
    const daysExpr = '(CURRENT_DATE - f.d_dat_atual_fam)';
    famConditions.push(`(f.d_dat_atual_fam IS NOT NULL AND ${daysExpr} >= 0)`);
    if (prazoRange.max != null) {
      famConditions.push(`(${daysExpr} <= ${prazoRange.max})`);
    }
    if (prazoRange.min != null) {
      famConditions.push(`(${daysExpr} > ${prazoRange.min})`);
    }
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
      famParams.length + pessoaParams.length;

    // Sempre retornar lista de bairros do resultado filtrado (mesmo filtros aplicados)
    const allConditions = [...famConditions, ...pessoaConditions];
    const allParams = [...famParams, ...pessoaParams];
    const whereClause = allConditions.length ? `WHERE ${allConditions.join(' AND ')}` : '';
    const baseFrom = hasPessoaFilters
      ? `vw_familias_limpa f INNER JOIN vw_pessoas_limpa p ON ${join}`
      : `vw_familias_limpa f`;
    const sqlBairros =
      `SELECT DISTINCT nome FROM (` +
      `SELECT f.d_nom_unidade_territorial_fam AS nome FROM ${baseFrom} ${whereClause} ` +
      `UNION SELECT f.d_nom_localidade_fam AS nome FROM ${baseFrom} ${whereClause}` +
      `) t WHERE nome IS NOT NULL AND TRIM(nome) != '' ORDER BY nome LIMIT 500`;
    let bairros: string[] = [];
    try {
      const resBairros = await query<{ nome: string }>(sqlBairros, allParams);
      bairros = resBairros.rows.filter((r) => r.nome != null).map((r) => String(r.nome));
    } catch (_) {
      bairros = [];
    }

    return NextResponse.json({
      totalFamilias,
      totalPessoas,
      filtros: totalFilterParams,
      bairros: bairros.length > 0 ? bairros : undefined,
    });
  } catch (e) {
    console.error('Dashboard stats error:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Erro ao calcular totais.' },
      { status: 500 }
    );
  }
}
