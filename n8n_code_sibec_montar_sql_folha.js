// =============================================================================
// N8N Code: Montar o SQL — workflow Extração FOLHA PAGAMENTO
// Saída: sql (DROP + CREATE) + headers + binary (repassa o CSV explicitamente).
// =============================================================================

const item = $input.first();

if (!item.binary || Object.keys(item.binary).length === 0) {
  throw new Error('Nenhum arquivo no item. Conecte a entrada deste nó à saída de "Extração Cabeçalho".');
}
const binaryKey = Object.keys(item.binary)[0];
const buffer = await this.helpers.getBinaryDataBuffer(0, binaryKey);
const fileName = item.binary[binaryKey].fileName || 'folha.csv';

const sql = `DROP TABLE IF EXISTS sibec_folha_pagamento CASCADE;

CREATE TABLE sibec_folha_pagamento (
    id                  SERIAL PRIMARY KEY,
    created_at          TIMESTAMPTZ DEFAULT now(),
    prog                TEXT,
    ref_folha           TEXT,
    uf                  TEXT,
    ibge                TEXT,
    cod_familiar        TEXT,
    cpf                 TEXT,
    nis                 TEXT,
    nome                TEXT,
    tipo_pgto_previsto  TEXT,
    pacto               TEXT,
    compet_parcela      TEXT,
    tp_benef            TEXT,
    vlrbenef            TEXT,
    vlrtotal            TEXT,
    sitbeneficio        TEXT,
    sitbeneficiario     TEXT,
    sitfam              TEXT,
    inicio_vig_benef    TEXT,
    fim_vig_benef       TEXT,
    marca_rf            TEXT,
    quilombola          TEXT,
    trab_escrv          TEXT,
    indigena            TEXT,
    catador_recic       TEXT,
    trabalho_inf        TEXT,
    renda_per_capita    TEXT,
    renda_com_pbf       TEXT,
    qtd_pessoas         TEXT,
    dt_atu_cadastral    TEXT,
    endereco            TEXT,
    bairro              TEXT,
    cep                 TEXT,
    telefone1           TEXT,
    telefone2           TEXT
);

CREATE INDEX idx_sibec_folha_ibge_cod ON sibec_folha_pagamento(ibge, cod_familiar);
CREATE INDEX idx_sibec_folha_ref ON sibec_folha_pagamento(ref_folha);
CREATE INDEX idx_sibec_folha_nis ON sibec_folha_pagamento(nis);`;

const binaryData = await this.helpers.prepareBinaryData(buffer, fileName);
return [{
  json: { ...item.json, sql },
  binary: { data: binaryData }
}];
