// =============================================================================
// N8N Code: Carregar Dados — workflow Extração BLOQUEADOS
// Entrada: saída de "Montar o SQL" (headers + binary). CSV com vírgula.
// Saída: vários itens, cada um com { sql: "INSERT INTO sibec_bloqueados (...) VALUES ...", loteIndex, rows }
// =============================================================================

const item = $input.first();
const headers = item.json?.headers || item.json?.headersOriginal;
const TAMANHO_LOTE = 3000;

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

// Colunas da tabela sibec_bloqueados (sem id, created_at)
const DB_COLS = ['uf', 'ibge', 'cod_familiar', 'nis', 'cpf', 'dt_hora_acao', 'cod_motivo', 'motivo'];
// Nomes no CSV (mesma ordem)
const CSV_HEADERS = ['UF', 'IBGE', 'COD_FAMILIAR', 'NIS', 'CPF', 'DT_HORA_ACAO', 'COD_MOTIVO', 'MOTIVO'];
const idxMap = CSV_HEADERS.map(n => {
  const i = headers.findIndex(h => String(h).trim().toUpperCase() === n);
  return i >= 0 ? i : -1;
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
    const vals = idxMap.map(idx => escapeSql(idx >= 0 ? (campos[idx] ?? '') : ''));
    return `(${vals.join(', ')})`;
  });
  const sql = `INSERT INTO sibec_bloqueados (${colList}) VALUES ${values.join(', ')}`;
  saida.push({ json: { sql, loteIndex: Math.floor(i / TAMANHO_LOTE) + 1, rows: lote.length } });
}

return saida;
