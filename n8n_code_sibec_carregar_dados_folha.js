// =============================================================================
// N8N Code: Carregar Dados — workflow Extração FOLHA PAGAMENTO
// Entrada: saída de "Montar o SQL" (headers + binary). CSV com vírgula.
// Saída: vários itens com { sql: "INSERT INTO sibec_folha_pagamento ...", loteIndex, rows }
// =============================================================================

const item = $input.first();
const headers = item.json?.headers || item.json?.headersOriginal;
const TAMANHO_LOTE = 2000;

if (!headers || !Array.isArray(headers)) {
  throw new Error('Item sem "headers". Conecte a ENTRADA deste nó à saída do "Montar o SQL".');
}
if (!item.binary || Object.keys(item.binary).length === 0) {
  throw new Error('Arquivo CSV não encontrado. A entrada deste nó deve vir do nó "Montar o SQL" (Code), NÃO do "Criar Tabela" (Postgres). No editor: arraste a seta de "Montar o SQL" para "Carregar Dados".');
}

const binaryKey = Object.keys(item.binary)[0];
const buffer = await this.helpers.getBinaryDataBuffer(0, binaryKey);
const content = buffer.toString('utf-8');

const linhas = content.split(/\r?\n/).filter(l => l.trim());
if (linhas.length < 2) {
  return [{ json: { inserted: 0, message: 'CSV só tem cabeçalho ou está vazio.' } }];
}

const dataLines = linhas.slice(1);

const DB_COLS = [
  'prog', 'ref_folha', 'uf', 'ibge', 'cod_familiar', 'cpf', 'nis', 'nome',
  'tipo_pgto_previsto', 'pacto', 'compet_parcela', 'tp_benef', 'vlrbenef', 'vlrtotal',
  'sitbeneficio', 'sitbeneficiario', 'sitfam', 'inicio_vig_benef', 'fim_vig_benef',
  'marca_rf', 'quilombola', 'trab_escrv', 'indigena', 'catador_recic', 'trabalho_inf',
  'renda_per_capita', 'renda_com_pbf', 'qtd_pessoas', 'dt_atu_cadastral',
  'endereco', 'bairro', 'cep', 'telefone1', 'telefone2'
];
const CSV_HEADERS = [
  'PROG', 'REF_FOLHA', 'UF', 'IBGE', 'COD_FAMILIAR', 'CPF', 'NIS', 'NOME',
  'TIPO_PGTO_PREVISTO', 'PACTO', 'COMPET_PARCELA', 'TP_BENEF', 'VLRBENEF', 'VLRTOTAL',
  'SITBENEFICIO', 'SITBENEFICIARIO', 'SITFAM', 'INICIO_VIG_BENEF', 'FIM_VIG_BENEF',
  'MARCA_RF', 'QUILOMBOLA', 'TRAB_ESCRV', 'INDIGENA', 'CATADOR_RECIC', 'TRABALHO_INF',
  'RENDA_PER_CAPITA', 'RENDA_COM_PBF', 'QTD_PESSOAS', 'DT_ATU_CADASTRAL',
  'ENDERECO', 'BAIRRO', 'CEP', 'TELEFONE1', 'TELEFONE2'
];
const idxMap = CSV_HEADERS.map((n, j) => {
  const i = headers.findIndex(h => String(h).trim().toUpperCase() === n);
  return i >= 0 ? i : j;
});

function escapeSql(val) {
  if (val == null || val === '') return 'NULL';
  const s = String(val).replace(/'/g, "''");
  return `'${s}'`;
}

const colList = DB_COLS.join(', ');
const saida = [];

for (let i = 0; i < dataLines.length; i += TAMANHO_LOTE) {
  const lote = dataLines.slice(i, i + TAMANHO_LOTE);
  const values = lote.map(linha => {
    const campos = linha.split(',').map(c => c.trim());
    const vals = idxMap.map((idx, j) => escapeSql(idx >= 0 ? (campos[idx] ?? '') : ''));
    return `(${vals.join(', ')})`;
  });
  const sql = `INSERT INTO sibec_folha_pagamento (${colList}) VALUES ${values.join(', ')}`;
  saida.push({ json: { sql, loteIndex: Math.floor(i / TAMANHO_LOTE) + 1, rows: lote.length } });
}

return saida;
