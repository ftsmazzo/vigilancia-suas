import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { query } from '@/lib/db';

/** Colunas de família (vw_familias_limpa) permitidas para filtro. */
const FAM_COLUMNS = new Set([
  'd_fx_rfpc',
  'd_cod_local_domic_fam',
  'd_cod_est_cadastral_fam',
  'd_cod_forma_coleta_fam',
  'd_cod_familia_indigena_fam',
  'd_cod_indigena_reside_fam',
]);
/** Colunas de pessoa (vw_pessoas_limpa) permitidas para filtro. */
const PESSOA_COLUMNS = new Set([
  'p_cod_sexo_pessoa',
  'p_cod_raca_cor_pessoa',
  'p_grau_instrucao',
  'p_fx_idade',
  'p_cod_parentesco_rf_pessoa',
]);

/**
 * GET /api/data/dashboard-stats
 * Totais de famílias e pessoas com filtros opcionais (valores do dicionário).
 * Query params: nome_campo=cod (ex.: d_fx_rfpc=1, p_cod_sexo_pessoa=2).
 */
export async function GET(request: NextRequest) {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const filters: { col: string; val: string }[] = [];
  searchParams.forEach((val, key) => {
    const v = val?.trim();
    if (!v) return;
    if (FAM_COLUMNS.has(key) || PESSOA_COLUMNS.has(key)) {
      filters.push({ col: key, val: v });
    }
  });

  const famFilters = filters.filter((f) => FAM_COLUMNS.has(f.col));
  const pessoaFilters = filters.filter((f) => PESSOA_COLUMNS.has(f.col));

  const famConditions: string[] = [];
  const famParams: unknown[] = [];
  let fi = 1;
  for (const f of famFilters) {
    famConditions.push(`(f.${f.col}::TEXT = $${fi} OR (f.${f.col} IS NULL AND $${fi} = ''))`);
    famParams.push(f.val);
    fi++;
  }

  const pessoaConditions: string[] = [];
  const pessoaParams: unknown[] = [];
  let pi = 1;
  for (const p of pessoaFilters) {
    pessoaConditions.push(`(p.${p.col}::TEXT = $${pi} OR (p.${p.col} IS NULL AND $${pi} = ''))`);
    pessoaParams.push(p.val);
    pi++;
  }

  try {
    const whereFam = famConditions.length ? `WHERE ${famConditions.join(' AND ')}` : '';
    const sqlFam = `SELECT COUNT(*) AS c FROM vw_familias_limpa f ${whereFam}`;
    const resFam = await query<{ c: string }>(sqlFam, famParams);
    const totalFamilias = parseInt(resFam.rows[0]?.c ?? '0', 10);

    let sqlPessoa: string;
    let paramsPessoa: unknown[];
    if (famFilters.length > 0) {
      const join = 'f.d_cd_ibge = p.d_cd_ibge AND f.d_cod_familiar_fam = p.d_cod_familiar_fam';
      const pessoaWhereOff = famParams.length;
      const pessoaWhereParts = pessoaFilters.map(
        (pf, i) => `(p.${pf.col}::TEXT = $${pessoaWhereOff + i + 1} OR (p.${pf.col} IS NULL AND $${pessoaWhereOff + i + 1} = ''))`
      );
      const allWhere = [...famConditions, ...pessoaWhereParts].filter(Boolean);
      const whereClause = allWhere.length ? `WHERE ${allWhere.join(' AND ')}` : '';
      sqlPessoa = `SELECT COUNT(*) AS c FROM vw_pessoas_limpa p INNER JOIN vw_familias_limpa f ON ${join} ${whereClause}`;
      paramsPessoa = [...famParams, ...pessoaParams];
    } else {
      const wherePessoa = pessoaConditions.length ? `WHERE ${pessoaConditions.join(' AND ')}` : '';
      sqlPessoa = `SELECT COUNT(*) AS c FROM vw_pessoas_limpa p ${wherePessoa}`;
      paramsPessoa = pessoaParams;
    }
    const resPessoa = await query<{ c: string }>(sqlPessoa, paramsPessoa);
    const totalPessoas = parseInt(resPessoa.rows[0]?.c ?? '0', 10);

    return NextResponse.json({
      totalFamilias,
      totalPessoas,
      filtros: filters.length,
    });
  } catch (e) {
    console.error('Dashboard stats error:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Erro ao calcular totais.' },
      { status: 500 }
    );
  }
}
