-- =============================================================================
-- Tabela Geo: base de endereços e CEP do município (territorialidade, lat/long, CRAS/CREAS).
-- Fonte: geo.csv (endereco, bairro, cep, id_endereco, id_cidade, id_bairro, lat_num, long_num, cras, creas).
-- Uso: cruzar com vw_familias_limpa por CEP + logradouro normalizado (ver GEO_ESTRATEGIA_SANITIZACAO.md).
-- =============================================================================

-- Requer norm_cep (create_views_cadu.sql) se quiser cep_norm na tabela.
-- Executar create_views_cadu.sql antes, ou criar norm_cep aqui se ainda não existir.

DROP TABLE IF EXISTS tbl_geo CASCADE;

CREATE TABLE tbl_geo (
  id SERIAL PRIMARY KEY,
  endereco TEXT,
  bairro TEXT,
  cep TEXT,
  cep_norm TEXT,  -- norm_cep(cep), preenchido na carga
  id_endereco INTEGER,
  id_cidade INTEGER,
  id_bairro INTEGER,
  lat_char TEXT,
  long_char TEXT,
  lat_num DOUBLE PRECISION,
  long_num DOUBLE PRECISION,
  cras INTEGER,
  creas INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE tbl_geo IS 'Base de endereços/CEP do município para georreferenciamento (fonte: geo.csv). Cruzar com CADU por CEP + logradouro normalizado.';

-- Índices para join por CEP e busca por endereço
CREATE INDEX idx_tbl_geo_cep_norm ON tbl_geo (cep_norm) WHERE cep_norm IS NOT NULL;
CREATE INDEX idx_tbl_geo_cep ON tbl_geo (cep) WHERE cep IS NOT NULL;
CREATE INDEX idx_tbl_geo_bairro ON tbl_geo (bairro) WHERE bairro IS NOT NULL;

-- Carga: usar COPY ou script (ex.: Node/psql) a partir de geo.csv.
-- Exemplo de atualização de cep_norm após carga (se norm_cep já existir):
-- UPDATE tbl_geo SET cep_norm = norm_cep(cep) WHERE cep_norm IS NULL;
