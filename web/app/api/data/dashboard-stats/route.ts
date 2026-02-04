import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { query } from '@/lib/db';

/** Colunas de família (vw_familias_territorio = todas as famílias com território da Geo quando há match) permitidas para filtro. */
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
/**
 * Prazo de atualização cadastral: dias desde d_dat_atual_fam até hoje (CURRENT_DATE).
 * Regra: mais de 12 meses e 1 dia = já é "De 12 a 24 meses"; mais de 24 meses e 1 dia = "De 24 a 48".
 * ate_12: dias <= 365 | 12_24: 365 < dias <= 730 | 24_48: 730 < dias <= 1460 | mais_48: dias > 1460
 */
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
 * Totais de famílias e pessoas cruzados por código familiar.
 * Múltiplos valores por filtro. Prazo de atualização: múltiplas faixas (OR).
 */
export async function GET(request: NextRequest) {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);

  const famMulti: { col: string; vals: string[] }[] = [];
  const pessoaMulti: { col: string; vals: string[] }[] = [];
  const prazoVals = getMultiValues(searchParams, 'prazo_atualizacao').filter(
    (v) => v && PRAZO_ATUALIZACAO_DAYS[v]
  );

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

  if (prazoVals.length > 0) {
    const daysExpr = '(CURRENT_DATE - f.d_dat_atual_fam)';
    const prazoOrParts: string[] = prazoVals.map((key) => {
      const range = PRAZO_ATUALIZACAO_DAYS[key];
      const parts: string[] = ['f.d_dat_atual_fam IS NOT NULL', `${daysExpr} >= 0`];
      if (range.max != null) parts.push(`(${daysExpr} <= ${range.max})`);
      if (range.min != null) parts.push(`(${daysExpr} > ${range.min})`);
      return `(${parts.join(' AND ')})`;
    });
    famConditions.push(`(${prazoOrParts.join(' OR ')})`);
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
        `SELECT DISTINCT f.d_cd_ibge, f.d_cod_familiar_fam FROM vw_familias_territorio f ` +
        `INNER JOIN vw_pessoas_limpa p ON ${join} ${whereClause}` +
        `) t`;
      const resFam = await query<{ c: string }>(sqlFam, allParams);
      totalFamilias = parseInt(resFam.rows[0]?.c ?? '0', 10);
    } else {
      const whereFam = hasFamFilters ? `WHERE ${famConditions.join(' AND ')}` : '';
      const sqlFam = `SELECT COUNT(*) AS c FROM vw_familias_territorio f ${whereFam}`;
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
        `INNER JOIN vw_familias_territorio f ON ${join} ${whereClause}`;
      const resPessoa = await query<{ c: string }>(sqlPessoa, allParams);
      totalPessoas = parseInt(resPessoa.rows[0]?.c ?? '0', 10);
    } else {
      const resPessoa = await query<{ c: string }>(`SELECT COUNT(*) AS c FROM vw_pessoas_limpa p`, []);
      totalPessoas = parseInt(resPessoa.rows[0]?.c ?? '0', 10);
    }

    const totalFilterParams = famParams.length + pessoaParams.length;

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
