-- Cache de respostas Via CEP para não repetir chamadas e respeitar rate limit.
-- Usado pelo enriquecimento em lote (API /api/admin/geo/via-cep-enrich).
DROP TABLE IF EXISTS tbl_via_cep_cache CASCADE;
CREATE TABLE tbl_via_cep_cache (
  cep_norm TEXT PRIMARY KEY,
  logradouro TEXT,
  bairro TEXT,
  localidade TEXT,
  uf TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
COMMENT ON TABLE tbl_via_cep_cache IS 'Cache Via CEP (por CEP). Enriquecimento em lote preenche tbl_geo a partir daqui.';
