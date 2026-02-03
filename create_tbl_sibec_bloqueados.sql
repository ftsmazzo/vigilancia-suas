-- =============================================================================
-- Tabela SIBEC Bloqueados (espelho do CSV SIBEC-BLOQUEADOS.csv)
-- Carga: mesmo esquema (TRUNCATE + INSERT em lote via N8N ou script).
-- =============================================================================

DROP TABLE IF EXISTS sibec_bloqueados CASCADE;

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

COMMENT ON TABLE sibec_bloqueados IS 'SIBEC - Bloqueados (COD_MOTIVO, MOTIVO). Cruzar por IBGE + COD_FAMILIAR + NIS/CPF.';
CREATE INDEX idx_sibec_bloqueados_ibge_cod ON sibec_bloqueados(ibge, cod_familiar);
CREATE INDEX idx_sibec_bloqueados_nis ON sibec_bloqueados(nis);
CREATE INDEX idx_sibec_bloqueados_cpf ON sibec_bloqueados(cpf);
