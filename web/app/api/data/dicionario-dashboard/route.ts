import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { query } from '@/lib/db';

/** Campos do dicionário usados como filtros na dashboard (nome_campo → label). */
const DASHBOARD_CAMPOS: { nome_campo: string; label: string }[] = [
  { nome_campo: 'd_fx_rfpc', label: 'Faixa Renda Família' },
  { nome_campo: 'd_cod_local_domic_fam', label: 'Local Domicílio' },
  { nome_campo: 'p_cod_sexo_pessoa', label: 'Sexo' },
  { nome_campo: 'p_cod_raca_cor_pessoa', label: 'Raça/Cor' },
  { nome_campo: 'p_grau_instrucao', label: 'Grau Instrução' },
  { nome_campo: 'p_fx_idade', label: 'Faixa Etária' },
];

/**
 * GET /api/data/dicionario-dashboard
 * Retorna opções para os dropdowns da dashboard (tbl_codigos_cadu).
 */
export async function GET() {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }

  const allowed = new Set(DASHBOARD_CAMPOS.map((c) => c.nome_campo));
  const labels = Object.fromEntries(DASHBOARD_CAMPOS.map((c) => [c.nome_campo, c.label]));

  try {
    const { rows } = await query<{ nome_campo: string; cod: string; descricao: string }>(
      `SELECT nome_campo, cod, descricao FROM tbl_codigos_cadu WHERE nome_campo = ANY($1) ORDER BY nome_campo, cod`,
      [Array.from(allowed)]
    );

    const byCampo: Record<string, { cod: string; descricao: string }[]> = {};
    for (const r of rows) {
      if (!allowed.has(r.nome_campo)) continue;
      if (!byCampo[r.nome_campo]) byCampo[r.nome_campo] = [];
      byCampo[r.nome_campo].push({ cod: r.cod, descricao: r.descricao });
    }

    const campos = DASHBOARD_CAMPOS.map(({ nome_campo, label }) => ({
      nome_campo,
      label,
      opcoes: byCampo[nome_campo] ?? [],
    }));

    return NextResponse.json({ campos });
  } catch (e) {
    console.error('Dicionario dashboard error:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Erro ao carregar dicionário.' },
      { status: 500 }
    );
  }
}
