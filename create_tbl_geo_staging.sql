-- =============================================================================
-- Tabela de STAGING para importar geo.csv pelo PGAdmin (tudo TEXT = sem erro de parsing).
-- Depois de importar o CSV nesta tabela, execute: load_geo_from_staging.sql
-- =============================================================================

DROP TABLE IF EXISTS tbl_geo_staging;

CREATE TABLE tbl_geo_staging (
  endereco TEXT,
  bairro TEXT,
  cep TEXT,
  id_endereco TEXT,
  id_cidade TEXT,
  id_bairro TEXT,
  lat_char TEXT,
  long_char TEXT,
  lat_num TEXT,
  long_num TEXT,
  cras TEXT,
  creas TEXT
);

COMMENT ON TABLE tbl_geo_staging IS 'Staging para import do geo.csv (PGAdmin Import). Todas colunas TEXT. Depois rode load_geo_from_staging.sql';
