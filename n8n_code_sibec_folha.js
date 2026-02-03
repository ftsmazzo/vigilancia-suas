// =============================================================================
// N8N Code: montar SQL para sibec_folha_pagamento
// Entrada: itens com chaves do CSV SIBEC-FOLHA_PAGAMENTO (PROG, REF_FOLHA, UF, ...)
//          (ex.: saída de "Spreadsheet File" ao ler SIBEC-FOLHA_PAGAMENTO.csv)
// Saída: 1 item com { sql: "TRUNCATE sibec_folha_pagamento; INSERT INTO ..." }
// =============================================================================

const items = $input.all();
if (!items.length) {
  return [{ json: { sql: 'TRUNCATE sibec_folha_pagamento;', rows: 0 } }];
}

const COLS = [
  'prog', 'ref_folha', 'uf', 'ibge', 'cod_familiar', 'cpf', 'nis', 'nome',
  'tipo_pgto_previsto', 'pacto', 'compet_parcela', 'tp_benef', 'vlrbenef', 'vlrtotal',
  'sitbeneficio', 'sitbeneficiario', 'sitfam', 'inicio_vig_benef', 'fim_vig_benef',
  'marca_rf', 'quilombola', 'trab_escrv', 'indigena', 'catador_recic', 'trabalho_inf',
  'renda_per_capita', 'renda_com_pbf', 'qtd_pessoas', 'dt_atu_cadastral',
  'endereco', 'bairro', 'cep', 'telefone1', 'telefone2'
];
const KEYS = [
  'PROG', 'REF_FOLHA', 'UF', 'IBGE', 'COD_FAMILIAR', 'CPF', 'NIS', 'NOME',
  'TIPO_PGTO_PREVISTO', 'PACTO', 'COMPET_PARCELA', 'TP_BENEF', 'VLRBENEF', 'VLRTOTAL',
  'SITBENEFICIO', 'SITBENEFICIARIO', 'SITFAM', 'INICIO_VIG_BENEF', 'FIM_VIG_BENEF',
  'MARCA_RF', 'QUILOMBOLA', 'TRAB_ESCRV', 'INDIGENA', 'CATADOR_RECIC', 'TRABALHO_INF',
  'RENDA_PER_CAPITA', 'RENDA_COM_PBF', 'QTD_PESSOAS', 'DT_ATU_CADASTRAL',
  'ENDERECO', 'BAIRRO', 'CEP', 'TELEFONE1', 'TELEFONE2'
];

function esc(v) {
  if (v === null || v === undefined || v === '') return 'NULL';
  return "'" + String(v).replace(/\\/g, '\\\\').replace(/'/g, "''") + "'";
}

const rows = [];
for (const item of items) {
  const j = item.json;
  const vals = KEYS.map((k) => esc(j[k] ?? null));
  rows.push(`(${vals.join(', ')})`);
}

const sql = `TRUNCATE sibec_folha_pagamento;\nINSERT INTO sibec_folha_pagamento (${COLS.join(', ')}) VALUES\n${rows.join(',\n')};`;
return [{ json: { sql, rows: items.length } }];
