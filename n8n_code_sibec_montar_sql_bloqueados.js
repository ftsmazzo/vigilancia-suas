// =============================================================================
// N8N Code: Montar o SQL — workflow Extração BLOQUEADOS
// Saída: sql (DROP + CREATE) + headers + binary (repassa o CSV explicitamente).
// =============================================================================

const item = $input.first();
if (!item.binary || Object.keys(item.binary).length === 0) {
  throw new Error('Nenhum arquivo no item. Conecte a entrada deste nó à saída de "Extração Cabeçalho".');
}
const binaryKey = Object.keys(item.binary)[0];
const buffer = await this.helpers.getBinaryDataBuffer(0, binaryKey);
const fileName = item.binary[binaryKey].fileName || 'bloqueados.csv';

const sql = `DROP TABLE IF EXISTS sibec_bloqueados CASCADE;

CREATE TABLE sibec_bloqueados (
    id          SERIAL PRIMARY KEY,
    created_at  TIMESTAMPTZ DEFAULT now(),
    uf          TEXT,
    ibge        TEXT,
    cod_familiar TEXT,
    nis         TEXT,
    cpf         TEXT,
    dt_hora_acao TEXT,
    cod_motivo  TEXT,
    motivo      TEXT
);

CREATE INDEX idx_sibec_bloqueados_ibge_cod ON sibec_bloqueados(ibge, cod_familiar);
CREATE INDEX idx_sibec_bloqueados_nis ON sibec_bloqueados(nis);
CREATE INDEX idx_sibec_bloqueados_cpf ON sibec_bloqueados(cpf);`;

const binaryData = await this.helpers.prepareBinaryData(buffer, fileName);
return [{
  json: { ...item.json, sql },
  binary: { data: binaryData }
}];
