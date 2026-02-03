/**
 * Lê dicionariotudo.csv e gera SQL INSERT para tbl_codigos_cadu (nome_campo, cod, descricao).
 * Formato resposta: "cod - descricao#cod - descricao" ou "cod-descricao"
 * Campo no CSV: "d.campo" ou "p.campo" → nome_campo = d_campo (ponto vira underscore)
 */
const fs = require('fs');
const path = require('path');

const csvPath = path.join(__dirname, '..', 'Dezembro', 'dicionariotudo.csv');
const content = fs.readFileSync(csvPath, 'utf-8');

const lines = content.split(/\r?\n/).filter(Boolean);
const out = [];
let count = 0;

for (let i = 1; i < lines.length; i++) {
  const line = lines[i];
  const match = line.match(/^"([^"]+)";"([^"]*)";"([^"]*)"$/);
  if (!match) continue;
  const [, campo, , resposta] = match;
  if (!resposta || !resposta.trim()) continue;

  const nome_campo = campo.replace(/\./g, '_');
  const opcoes = resposta.split('#').map(s => s.trim()).filter(Boolean);

  for (const op of opcoes) {
    let cod, descricao;
    const idxSpaceHyphen = op.indexOf(' - ');
    if (idxSpaceHyphen >= 0) {
      cod = op.slice(0, idxSpaceHyphen).trim();
      descricao = op.slice(idxSpaceHyphen + 3).trim();
    } else {
      const idxHyphen = op.indexOf('-');
      if (idxHyphen >= 0) {
        cod = op.slice(0, idxHyphen).trim();
        descricao = op.slice(idxHyphen + 1).trim();
      } else {
        continue;
      }
    }
    if (!cod) continue;
    descricao = descricao.replace(/'/g, "''");
    out.push(`('${nome_campo}', '${cod}', '${descricao}')`);
    count++;
  }
}

const sql = `-- Gerado por gerar_tbl_codigos_from_dicionario.js a partir de Dezembro/dicionariotudo.csv
-- Tabela auxiliar para cruzar códigos numéricos com descritores (sexo, escolaridade, raça, etc.)

INSERT INTO tbl_codigos_cadu (nome_campo, cod, descricao) VALUES
${out.join(',\n')}
ON CONFLICT (nome_campo, cod) DO UPDATE SET descricao = EXCLUDED.descricao;
`;

const outPath = path.join(__dirname, '..', 'insert_tbl_codigos_cadu_generated.sql');
fs.writeFileSync(outPath, sql, 'utf-8');
console.log('Gerados', count, 'registros em', outPath);
