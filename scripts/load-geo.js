/**
 * Lê geo.csv e gera SQL para inserir em tbl_geo (e preencher cep_norm).
 * Uso: node scripts/load-geo.js
 * Gera: load_geo_generated.sql na raiz. Depois: psql -d vigilancia -f load_geo_generated.sql
 *
 * Requer create_tbl_geo.sql já executado e norm_cep (create_views_cadu.sql).
 */
const fs = require('fs');
const path = require('path');

const csvPath = path.join(__dirname, '..', 'geo.csv');
const outPath = path.join(__dirname, '..', 'load_geo_generated.sql');

function parseCSVLine(line) {
  const result = [];
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

function escapeSql(s) {
  if (s == null || s === '') return null;
  const t = String(s).trim();
  if (t === '') return null;
  return "'" + t.replace(/'/g, "''") + "'";
}

function numOrNull(s) {
  if (s == null || s === '') return 'NULL';
  const t = String(s).trim();
  if (t === '') return 'NULL';
  const n = parseFloat(t);
  if (Number.isNaN(n)) return 'NULL';
  return String(n);
}

function intOrNull(s) {
  if (s == null || s === '') return 'NULL';
  const t = String(s).trim();
  if (t === '') return 'NULL';
  const n = parseInt(t, 10);
  if (Number.isNaN(n)) return 'NULL';
  return String(n);
}

const content = fs.readFileSync(csvPath, 'utf-8');
const lines = content.split(/\r?\n/).filter((l) => l.trim());

if (lines.length < 2) {
  console.error('geo.csv vazio ou só cabeçalho.');
  process.exit(1);
}

const header = parseCSVLine(lines[0]);
const rows = [];

for (let i = 1; i < lines.length; i++) {
  const cols = parseCSVLine(lines[i]);
  if (cols.length < header.length) continue;
  const endereco = cols[0];
  const bairro = cols[1];
  const cep = cols[2];
  const id_endereco = cols[3];
  const id_cidade = cols[4];
  const id_bairro = cols[5];
  const lat_char = cols[6];
  const long_char = cols[7];
  const lat_num = cols[8];
  const long_num = cols[9];
  const cras = cols[10];
  const creas = cols[11];

  const vals = [
    escapeSql(endereco),
    escapeSql(bairro),
    escapeSql(cep),
    intOrNull(id_endereco),
    intOrNull(id_cidade),
    intOrNull(id_bairro),
    escapeSql(lat_char) ?? 'NULL',
    escapeSql(long_char) ?? 'NULL',
    numOrNull(lat_num),
    numOrNull(long_num),
    intOrNull(cras),
    intOrNull(creas),
  ].join(', ');
  rows.push(`(${vals})`);
}

const batchSize = 100;
const inserts = [];
for (let i = 0; i < rows.length; i += batchSize) {
  const chunk = rows.slice(i, i + batchSize);
  inserts.push(
    `INSERT INTO tbl_geo (endereco, bairro, cep, id_endereco, id_cidade, id_bairro, lat_char, long_char, lat_num, long_num, cras, creas) VALUES\n${chunk.join(',\n')};`
  );
}

const sql = [
  '-- Gerado por scripts/load-geo.js. Executar após create_tbl_geo.sql e create_views_cadu.sql.',
  'TRUNCATE TABLE tbl_geo RESTART IDENTITY;',
  ...inserts,
  "UPDATE tbl_geo SET cep_norm = norm_cep(cep) WHERE cep_norm IS NULL AND cep IS NOT NULL AND TRIM(cep) != '';",
].join('\n\n');

fs.writeFileSync(outPath, sql, 'utf-8');
console.log(`Gerado ${outPath} com ${rows.length} linhas. Executar: psql -d vigilancia -f load_geo_generated.sql`);
process.exit(0);
