-- =============================================================================
-- Tabela SIBEC Folha de Pagamento (espelho do CSV SIBEC-FOLHA_PAGAMENTO.csv)
-- Carga: mesmo esquema (TRUNCATE + INSERT em lote via N8N ou script).
-- =============================================================================

DROP TABLE IF EXISTS sibec_folha_pagamento CASCADE;

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
    trabalho_inf       TEXT,
    renda_per_capita    TEXT,
    renda_com_pbf       TEXT,
    qtd_pessoas         TEXT,
    dt_atu_cadastral    TEXT,
    endereco            TEXT,
    bairro              TEXT,
    cep                 TEXT,
    telefone1          TEXT,
    telefone2           TEXT
);

COMMENT ON TABLE sibec_folha_pagamento IS 'SIBEC - Folha de Pagamento. Cruzar com vw_familias_limpa por IBGE + COD_FAMILIAR + NIS (RF).';
CREATE INDEX idx_sibec_folha_ibge_cod ON sibec_folha_pagamento(ibge, cod_familiar);
CREATE INDEX idx_sibec_folha_ref ON sibec_folha_pagamento(ref_folha);
CREATE INDEX idx_sibec_folha_nis ON sibec_folha_pagamento(nis);
