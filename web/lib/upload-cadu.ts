/**
 * Upload CADU: CSV com ; delimitador, cabeçalho d. / p. → colunas d_ / p_.
 * Gera DROP TABLE, CREATE TABLE (dinâmico) e INSERT em lotes.
 */
function escapeSql(val: string | null | undefined): string {
  if (val == null || val === '') return 'NULL';
  const s = String(val).replace(/'/g, "''");
  return `'${s}'`;
}

export function buildCaduUpload(content: string): {
  createStatements: string[];
  insertStatements: string[];
  rowCount: number;
} {
  const lines = content.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) {
    return {
      createStatements: [],
      insertStatements: [],
      rowCount: 0,
    };
  }

  const headerLine = lines[0];
  const headersOriginal = headerLine.split(';').map((h) => h.trim());
  const headers = headersOriginal.map((h) => h.replace(/\./g, '_'));

  const dropCreate = [
    `DROP TABLE IF EXISTS cadu_raw CASCADE`,
    `CREATE TABLE cadu_raw (id SERIAL PRIMARY KEY, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, ${headers.map((h) => `${h} TEXT`).join(', ')})`,
    `CREATE INDEX idx_cadu_raw_cod_familiar_fam ON cadu_raw(d_cod_familiar_fam)`,
    `CREATE INDEX idx_cadu_raw_cpf ON cadu_raw(p_num_cpf_pessoa)`,
    `CREATE INDEX idx_cadu_raw_nis ON cadu_raw(p_num_nis_pessoa_atual)`,
    `CREATE INDEX idx_cadu_raw_created_at ON cadu_raw(created_at)`,
  ];

  const dataLines = lines.slice(1);
  const BATCH = 1000;
  const colList = headers.join(', ');
  const insertStatements: string[] = [];

  for (let i = 0; i < dataLines.length; i += BATCH) {
    const batch = dataLines.slice(i, i + BATCH);
    const values = batch.map((line) => {
      const fields = line.split(';').map((f) => f.trim());
      const vals = headers.map((_, idx) => escapeSql(fields[idx]));
      return `(${vals.join(', ')})`;
    });
    insertStatements.push(`INSERT INTO cadu_raw (${colList}) VALUES ${values.join(', ')}`);
  }

  return {
    createStatements: dropCreate,
    insertStatements,
    rowCount: dataLines.length,
  };
}
