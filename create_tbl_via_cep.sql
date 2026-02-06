-- =============================================================================
-- Tabela intermediária Via CEP: guarda o retorno da API para cada CEP consultado.
-- Fonte: CEPs de vw_familias_territorio WHERE cep_territorio IS NULL.
-- Depois: INSERT desses registros na tbl_geo (botão "Copiar Via CEP → Geo").
-- =============================================================================

DROP TABLE IF EXISTS tbl_via_cep CASCADE;

CREATE TABLE tbl_via_cep (
  cep_norm TEXT PRIMARY KEY,
  logradouro TEXT,
  bairro TEXT,
  localidade TEXT,
  uf TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE tbl_via_cep IS 'Intermediária: resultado Via CEP por CEP (sem território). Copiar para tbl_geo quando quiser.';
