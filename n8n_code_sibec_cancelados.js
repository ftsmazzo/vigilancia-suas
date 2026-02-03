// =============================================================================
// N8N Code: montar SQL para sibec_cancelados
// Entrada: itens com chaves UF, IBGE, COD_FAMILIAR, DT_HORA_ACAO, COD_MOTIVO, MOTIVO
//          (ex.: saída de "Spreadsheet File" ao ler SIBEC-CANCELADOS.csv)
// Saída: 1 item com { sql: "TRUNCATE sibec_cancelados; INSERT INTO ..." }
// =============================================================================

const items = $input.all();
if (!items.length) {
  return [{ json: { sql: 'TRUNCATE sibec_cancelados;', rows: 0 } }];
}

const COLS = ['uf', 'ibge', 'cod_familiar', 'dt_hora_acao', 'cod_motivo', 'motivo'];
const KEYS = ['UF', 'IBGE', 'COD_FAMILIAR', 'DT_HORA_ACAO', 'COD_MOTIVO', 'MOTIVO'];

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

const sql = `TRUNCATE sibec_cancelados;\nINSERT INTO sibec_cancelados (${COLS.join(', ')}) VALUES\n${rows.join(',\n')};`;
return [{ json: { sql, rows: items.length } }];
