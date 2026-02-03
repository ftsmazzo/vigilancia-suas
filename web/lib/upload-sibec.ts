/**
 * Helpers para upload SIBEC: parse CSV (vírgula) e montar TRUNCATE + INSERT.
 * Colunas por tabela (sem id, created_at).
 */
export const SIBEC_BLOQUEADOS = {
  table: 'sibec_bloqueados',
  dbCols: ['uf', 'ibge', 'cod_familiar', 'nis', 'cpf', 'dt_hora_acao', 'cod_motivo', 'motivo'],
  csvHeaders: ['UF', 'IBGE', 'COD_FAMILIAR', 'NIS', 'CPF', 'DT_HORA_ACAO', 'COD_MOTIVO', 'MOTIVO'],
};

export const SIBEC_CANCELADOS = {
  table: 'sibec_cancelados',
  dbCols: ['uf', 'ibge', 'cod_familiar', 'dt_hora_acao', 'cod_motivo', 'motivo'],
  csvHeaders: ['UF', 'IBGE', 'COD_FAMILIAR', 'DT_HORA_ACAO', 'COD_MOTIVO', 'MOTIVO'],
};

export const SIBEC_FOLHA = {
  table: 'sibec_folha_pagamento',
  dbCols: [
    'prog', 'ref_folha', 'uf', 'ibge', 'cod_familiar', 'cpf', 'nis', 'nome',
    'tipo_pgto_previsto', 'pacto', 'compet_parcela', 'tp_benef', 'vlrbenef', 'vlrtotal',
    'sitbeneficio', 'sitbeneficiario', 'sitfam', 'inicio_vig_benef', 'fim_vig_benef',
    'marca_rf', 'quilombola', 'trab_escrv', 'indigena', 'catador_recic', 'trabalho_inf',
    'renda_per_capita', 'renda_com_pbf', 'qtd_pessoas', 'dt_atu_cadastral',
    'endereco', 'bairro', 'cep', 'telefone1', 'telefone2',
  ],
  csvHeaders: [
    'PROG', 'REF_FOLHA', 'UF', 'IBGE', 'COD_FAMILIAR', 'CPF', 'NIS', 'NOME',
    'TIPO_PGTO_PREVISTO', 'PACTO', 'COMPET_PARCELA', 'TP_BENEF', 'VLRBENEF', 'VLRTOTAL',
    'SITBENEFICIO', 'SITBENEFICIARIO', 'SITFAM', 'INICIO_VIG_BENEF', 'FIM_VIG_BENEF',
    'MARCA_RF', 'QUILOMBOLA', 'TRAB_ESCRV', 'INDIGENA', 'CATADOR_RECIC', 'TRABALHO_INF',
    'RENDA_PER_CAPITA', 'RENDA_COM_PBF', 'QTD_PESSOAS', 'DT_ATU_CADASTRAL',
    'ENDERECO', 'BAIRRO', 'CEP', 'TELEFONE1', 'TELEFONE2',
  ],
};

function escapeSql(val: string | null | undefined): string {
  if (val == null || val === '') return 'NULL';
  const s = String(val).replace(/'/g, "''");
  return `'${s}'`;
}

export function buildSibecUpload(
  content: string,
  config: { table: string; dbCols: string[]; csvHeaders: string[] }
): { truncateSql: string; insertStatements: string[]; rowCount: number } {
  const lines = content.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) {
    return { truncateSql: `TRUNCATE TABLE ${config.table};`, insertStatements: [], rowCount: 0 };
  }
  const headers = lines[0].split(',').map((h) => h.trim().toUpperCase());
  const idxMap = config.csvHeaders.map((name) => headers.indexOf(name));
  const dataLines = lines.slice(1);
  const BATCH = 2000;
  const colList = config.dbCols.join(', ');
  const insertStatements: string[] = [];
  for (let i = 0; i < dataLines.length; i += BATCH) {
    const batch = dataLines.slice(i, i + BATCH);
    const values = batch.map((line) => {
      const fields = line.split(',').map((f) => f.trim());
      const vals = idxMap.map((idx) => escapeSql(idx >= 0 ? fields[idx] : ''));
      return `(${vals.join(', ')})`;
    });
    insertStatements.push(`INSERT INTO ${config.table} (${colList}) VALUES ${values.join(', ')}`);
  }
  return {
    truncateSql: `TRUNCATE TABLE ${config.table};`,
    insertStatements,
    rowCount: dataLines.length,
  };
}
