// =============================================================================
// N8N Code node: "Montar SQL visitas"
// Entrada: saída de "Get row(s) in sheet" (Extração Entrevistas).
// Saída: 1 item com { sql: "TRUNCATE visitas_raw; INSERT INTO visitas_raw (...) VALUES (...), ..." }
// Conectar saída ao nó Postgres "Execute Query" com query = {{ $json.sql }}
// =============================================================================

const items = $input.all();
if (!items.length) {
  return [{ json: { sql: 'TRUNCATE visitas_raw;', rows: 0 } }];
}

// Mapeamento: chave no JSON/Sheets (possíveis variantes) → coluna visitas_raw
function getVal(obj, keys) {
  for (const k of keys) {
    if (obj[k] === undefined) continue;
    if (obj[k] === null) return null;
    if (typeof obj[k] === 'number' && !Number.isNaN(obj[k])) return obj[k];
    if (String(obj[k]).trim() === '') return null;
    return obj[k];
  }
  return null;
}

const COLS = [
  [['row_number'], 'row_number'],
  [['Carimbo de data/hora'], 'carimbo_data_hora'],
  [['\n Nome da pessoa', 'Nome da pessoa'], 'nome_pessoa'],
  [['CPF'], 'cpf'],
  [['Data de Nascimento'], 'data_nascimento'],
  [['Nome da Rua'], 'nome_rua'],
  [['Número'], 'numero'],
  [['Bairro'], 'bairro'],
  [['Telefone para contato'], 'telefone_contato'],
  [['Referência para Localização'], 'referencia_localizacao'],
  [['Tipo de atendimento'], 'tipo_atendimento'],
  [['Local de Atendimento'], 'local_atendimento'],
  [['ATENDENTE  ', 'ATENDENTE'], 'atendente'],
  [['Quais períodos a pessoa prefere a visita?'], 'periodos_preferidos_visita'],
  [['Número de pessoas na família'], 'num_pessoas_familia'],
  [['É area de difícil acesso? ', 'É area de difícil acesso?'], 'area_dificil_acesso'],
  [['1ª Visita\nData', '1ª Visita - Data'], 'visita1_data'],
  [['1ª Visita\nEntrevistadores', '1ª Visita - Entrevistadores'], 'visita1_entrevistadores'],
  [['1ª Visita\nFamília Localizada?', '1ª Visita - Família Localizada?'], 'visita1_familia_localizada'],
  [['1ª Visita\nCadastro Atualizado?', '1ª Visita - Cadastro Atualizado?'], 'visita1_cadastro_atualizado'],
  [['1ª Visita\nObservação', '1ª Visita - Observação'], 'visita1_observacao'],
  [['2ª Visita\nData', '2ª Visita - Data'], 'visita2_data'],
  [['2ª Visita\nEntrevistadores', '2ª Visita - Entrevistadores'], 'visita2_entrevistadores'],
  [['2ª Visita\nFamília Localizada?', '2ª Visita - Família Localizada?'], 'visita2_familia_localizada'],
  [['2ª Visita\nCadastro Atualizado?', '2ª Visita - Cadastro Atualizado?'], 'visita2_cadastro_atualizado'],
  [['2ª Visita\nObservação', '2ª Visita - Observação'], 'visita2_observacao'],
  [['3ª Visita\nData', '3ª Visita - Data'], 'visita3_data'],
  [['3ª Visita\nEntrevistadores', '3ª Visita - Entrevistadores'], 'visita3_entrevistadores'],
  [['3ª Visita\nFamília Localizada?', '3ª Visita - Família Localizada?'], 'visita3_familia_localizada'],
  [['3ª Visita\nCadastro Atualizado?', '3ª Visita - Cadastro Atualizado?'], 'visita3_cadastro_atualizado'],
  [['3ª Visita\nObservação', '3ª Visita - Observação'], 'visita3_observacao'],
  [['Já foi feita alguma visita?'], 'ja_teve_visita'],
  [['Teve 1ª Visita?'], 'teve_visita1'],
  [['Teve 2ª Visita?'], 'teve_visita2'],
  [['Teve 3ª Visita?'], 'teve_visita3'],
  [['Ainda precisa de visita?'], 'ainda_precisa_visita'],
  [['Bloqueados'], 'bloqueados'],
  [['Cancelados'], 'cancelados'],
  [['Cancelado em'], 'cancelado_em'],
  [['Tempo desde a última atualização'], 'tempo_desde_ultima_atualizacao'],
];

const columnNames = COLS.map(([, col]) => col);

function escapeSql(v) {
  if (v === null || v === undefined || v === '') return 'NULL';
  const s = String(v).replace(/\\/g, '\\\\').replace(/'/g, "''");
  return `'${s}'`;
}

function toSqlValue(v, col) {
  if (v === null || v === undefined || v === '') return 'NULL';
  if (col === 'row_number' || col === 'tempo_desde_ultima_atualizacao') {
    const n = Number(v);
    if (!Number.isNaN(n) && isFinite(n)) return String(n);
    return 'NULL'; // texto tipo "Não consta na base de dados" → NULL
  }
  return escapeSql(v);
}

const valuesRows = [];
for (const item of items) {
  const json = item.json;
  const vals = [];
  for (const [keys, col] of COLS) {
    const v = getVal(json, keys);
    vals.push(toSqlValue(v, col));
  }
  valuesRows.push(`(${vals.join(', ')})`);
}

const columnsList = columnNames.join(', ');
const insertSql = `INSERT INTO visitas_raw (${columnsList}) VALUES ${valuesRows.join(',\n')};`;
const fullSql = `TRUNCATE visitas_raw;\n${insertSql}`;

return [{ json: { sql: fullSql, rows: items.length } }];
