-- =============================================================================
-- Copia dados de tbl_geo_staging para tbl_geo com conversão e NULLs corretos.
-- Execute DEPOIS de importar o geo.csv na tbl_geo_staging (PGAdmin → tbl_geo_staging → Import).
-- Requer: tbl_geo e norm_cep já existirem.
-- =============================================================================

TRUNCATE TABLE tbl_geo RESTART IDENTITY;

INSERT INTO tbl_geo (
  endereco,
  bairro,
  cep,
  id_endereco,
  id_cidade,
  id_bairro,
  lat_char,
  long_char,
  lat_num,
  long_num,
  cras,
  creas
)
SELECT
  NULLIF(TRIM(s.endereco), ''),
  NULLIF(TRIM(s.bairro), ''),
  NULLIF(TRIM(s.cep), ''),
  CASE WHEN NULLIF(NULLIF(TRIM(s.id_endereco), ''), 'NULL') ~ '^-?\d+$' THEN TRIM(s.id_endereco)::INTEGER ELSE NULL END,
  CASE WHEN NULLIF(NULLIF(TRIM(s.id_cidade), ''), 'NULL') ~ '^-?\d+$' THEN TRIM(s.id_cidade)::INTEGER ELSE NULL END,
  CASE WHEN NULLIF(NULLIF(TRIM(s.id_bairro), ''), 'NULL') ~ '^-?\d+$' THEN TRIM(s.id_bairro)::INTEGER ELSE NULL END,
  NULLIF(NULLIF(TRIM(s.lat_char), ''), 'NULL'),
  NULLIF(NULLIF(TRIM(s.long_char), ''), 'NULL'),
  CASE WHEN NULLIF(NULLIF(TRIM(s.lat_num), ''), 'NULL') ~ '^-?[\d.]+$' THEN TRIM(s.lat_num)::DOUBLE PRECISION ELSE NULL END,
  CASE WHEN NULLIF(NULLIF(TRIM(s.long_num), ''), 'NULL') ~ '^-?[\d.]+$' THEN TRIM(s.long_num)::DOUBLE PRECISION ELSE NULL END,
  CASE WHEN NULLIF(NULLIF(TRIM(s.cras), ''), 'NULL') ~ '^-?\d+$' THEN TRIM(s.cras)::INTEGER ELSE NULL END,
  CASE WHEN NULLIF(NULLIF(TRIM(s.creas), ''), 'NULL') ~ '^-?\d+$' THEN TRIM(s.creas)::INTEGER ELSE NULL END
FROM tbl_geo_staging s
WHERE NULLIF(TRIM(s.endereco), '') IS NOT NULL OR NULLIF(TRIM(s.cep), '') IS NOT NULL;

UPDATE tbl_geo SET cep_norm = norm_cep(cep) WHERE cep_norm IS NULL AND cep IS NOT NULL AND TRIM(cep) != '';

-- Opcional: remover staging após conferir
-- DROP TABLE tbl_geo_staging;
