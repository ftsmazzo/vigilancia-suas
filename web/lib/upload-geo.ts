/**
 * Upload Geo: parse CSV (vírgula, campos entre aspas) e montar TRUNCATE + INSERT para tbl_geo.
 * Colunas: endereco, bairro, cep, id_endereco, id_cidade, id_bairro, lat_char, long_char, lat_num, long_num, cras, creas.
 * cep_norm é preenchido depois com UPDATE norm_cep(cep).
 */

const GEO_CSV_HEADERS = [
  'endereco',
  'bairro',
  'cep',
  'id_endereco',
  'id_cidade',
  'id_bairro',
  'lat_char',
  'long_char',
  'lat_num',
  'long_num',
  'cras',
  'creas',
] as const;

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '"') {
      inQuotes = !inQuotes;
    } else if (line[i] === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += line[i];
    }
  }
  result.push(current.trim());
  return result;
}

function escapeSql(val: string | null | undefined): string {
  if (val == null || val === '' || String(val).toUpperCase() === 'NULL') return 'NULL';
  const s = String(val).replace(/'/g, "''");
  return `'${s}'`;
}

function numOrNull(val: string | null | undefined): string {
  if (val == null || val === '' || String(val).toUpperCase() === 'NULL') return 'NULL';
  const t = String(val).trim();
  if (t === '') return 'NULL';
  const n = parseFloat(t);
  return Number.isNaN(n) ? 'NULL' : String(n);
}

function intOrNull(val: string | null | undefined): string {
  if (val == null || val === '' || String(val).toUpperCase() === 'NULL') return 'NULL';
  const t = String(val).trim();
  if (t === '') return 'NULL';
  const n = parseInt(t, 10);
  return Number.isNaN(n) ? 'NULL' : String(n);
}

export function buildGeoUpload(content: string): {
  truncateSql: string;
  insertStatements: string[];
  updateCepNormSql: string;
  rowCount: number;
} {
  const lines = content.split(/\r?\n/).filter((l) => l.length > 0);
  if (lines.length < 2) {
    return {
      truncateSql: 'TRUNCATE TABLE tbl_geo RESTART IDENTITY;',
      insertStatements: [],
      updateCepNormSql: "UPDATE tbl_geo SET cep_norm = norm_cep(cep) WHERE cep_norm IS NULL AND cep IS NOT NULL AND TRIM(cep) != '';",
      rowCount: 0,
    };
  }

  const headerLine = parseCSVLine(lines[0]);
  const headerLower = headerLine.map((h) => h.trim().toLowerCase());
  const idxMap = GEO_CSV_HEADERS.map((name) => headerLower.indexOf(name));

  const BATCH = 500;
  const colList = Array.from(GEO_CSV_HEADERS).join(', ');
  const insertStatements: string[] = [];
  const dataLines = lines.slice(1);

  let rowCount = 0;
  for (let i = 0; i < dataLines.length; i += BATCH) {
    const batch = dataLines.slice(i, i + BATCH);
    const values: string[] = [];
    for (const line of batch) {
      const cols = parseCSVLine(line);
      const endereco = idxMap[0] >= 0 ? cols[idxMap[0]] : '';
      const cep = idxMap[2] >= 0 ? cols[idxMap[2]] : '';
      if (!endereco?.trim() && !cep?.trim()) continue;
      const bairro = idxMap[1] >= 0 ? cols[idxMap[1]] : '';
      const id_endereco = idxMap[3] >= 0 ? cols[idxMap[3]] : '';
      const id_cidade = idxMap[4] >= 0 ? cols[idxMap[4]] : '';
      const id_bairro = idxMap[5] >= 0 ? cols[idxMap[5]] : '';
      const lat_char = idxMap[6] >= 0 ? cols[idxMap[6]] : '';
      const long_char = idxMap[7] >= 0 ? cols[idxMap[7]] : '';
      const lat_num = idxMap[8] >= 0 ? cols[idxMap[8]] : '';
      const long_num = idxMap[9] >= 0 ? cols[idxMap[9]] : '';
      const cras = idxMap[10] >= 0 ? cols[idxMap[10]] : '';
      const creas = idxMap[11] >= 0 ? cols[idxMap[11]] : '';

      const vals = [
        escapeSql(endereco),
        escapeSql(bairro),
        escapeSql(cep),
        intOrNull(id_endereco),
        intOrNull(id_cidade),
        intOrNull(id_bairro),
        escapeSql(lat_char),
        escapeSql(long_char),
        numOrNull(lat_num),
        numOrNull(long_num),
        intOrNull(cras),
        intOrNull(creas),
      ].join(', ');
      values.push(`(${vals})`);
      rowCount++;
    }
    if (values.length > 0) {
      insertStatements.push(`INSERT INTO tbl_geo (${colList}) VALUES ${values.join(', ')}`);
    }
  }
  return {
    truncateSql: 'TRUNCATE TABLE tbl_geo RESTART IDENTITY;',
    insertStatements,
    updateCepNormSql: "UPDATE tbl_geo SET cep_norm = norm_cep(cep) WHERE cep_norm IS NULL AND cep IS NOT NULL AND TRIM(cep) != '';",
    rowCount,
  };
}
