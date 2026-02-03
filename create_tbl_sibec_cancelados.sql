-- =============================================================================
-- Tabela SIBEC Cancelados (espelho do CSV SIBEC-CANCELADOS.csv)
-- Carga: mesmo esquema (TRUNCATE + INSERT em lote via N8N ou script).
-- =============================================================================

DROP TABLE IF EXISTS sibec_cancelados CASCADE;

CREATE TABLE sibec_cancelados (
    id          SERIAL PRIMARY KEY,
    created_at  TIMESTAMPTZ DEFAULT now(),
    uf          TEXT,
    ibge        TEXT,
    cod_familiar TEXT,
    dt_hora_acao TEXT,
    cod_motivo  TEXT,
    motivo      TEXT
);

COMMENT ON TABLE sibec_cancelados IS 'SIBEC - Cancelados (COD_MOTIVO, MOTIVO). Cruzar por IBGE + COD_FAMILIAR.';
CREATE INDEX idx_sibec_cancelados_ibge_cod ON sibec_cancelados(ibge, cod_familiar);
