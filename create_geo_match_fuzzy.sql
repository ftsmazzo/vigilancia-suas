-- =============================================================================
-- Match por similaridade (pg_trgm): tolera erros de ortografia (ex.: Braisl vs Brasil).
-- Rode DEPOIS de create_geo_match_step1.sql e step2.sql.
-- Requer: CREATE EXTENSION pg_trgm; (pode exigir permissão de superuser no servidor).
-- Depois: incluir REFRESH MATERIALIZED VIEW mv_familias_geo_fuzzy no "Atualizar match Geo"
-- e recriar vw_familias_territorio para usar g3 (este script já recria a view).
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pg_trgm;

DROP MATERIALIZED VIEW IF EXISTS mv_familias_geo_fuzzy CASCADE;

CREATE MATERIALIZED VIEW mv_familias_geo_fuzzy AS
WITH fam_logradouro AS (
  SELECT
    f.d_cod_familiar_fam,
    f.d_num_cep_logradouro_fam,
    norm_logradouro_para_match(CONCAT_WS(' ',
      NULLIF(TRIM(COALESCE(f.d_nom_tip_logradouro_fam, '')), ''),
      NULLIF(TRIM(COALESCE(f.d_nom_titulo_logradouro_fam, '')), ''),
      NULLIF(TRIM(COALESCE(f.d_nom_logradouro_fam, '')), '')
    )) AS logradouro_norm
  FROM mv_familias_limpa f
  WHERE f.d_num_cep_logradouro_fam IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM mv_familias_geo g1 WHERE g1.d_cod_familiar_fam = f.d_cod_familiar_fam)
    AND NOT EXISTS (SELECT 1 FROM mv_familias_geo_por_logradouro g2 WHERE g2.d_cod_familiar_fam = f.d_cod_familiar_fam)
),
ranked AS (
  SELECT
    fl.d_cod_familiar_fam,
    g.cep,
    g.endereco,
    g.bairro,
    g.cras,
    g.creas,
    g.lat_num,
    g.long_num,
    similarity(fl.logradouro_norm, norm_logradouro_para_match(g.endereco)) AS sim
  FROM fam_logradouro fl
  INNER JOIN tbl_geo g
    ON g.cep_norm = fl.d_num_cep_logradouro_fam
   AND g.endereco IS NOT NULL
   AND norm_logradouro_para_match(g.endereco) IS NOT NULL
   AND similarity(fl.logradouro_norm, norm_logradouro_para_match(g.endereco)) > 0.5
)
SELECT DISTINCT ON (d_cod_familiar_fam)
  d_cod_familiar_fam,
  cep    AS cep_geo,
  endereco AS endereco_geo,
  bairro AS bairro_geo,
  cras   AS cras_geo,
  creas  AS creas_geo,
  lat_num AS lat_geo,
  long_num AS long_geo
FROM ranked
ORDER BY d_cod_familiar_fam, sim DESC;

CREATE UNIQUE INDEX idx_mv_familias_geo_fuzzy_fam ON mv_familias_geo_fuzzy (d_cod_familiar_fam);
COMMENT ON MATERIALIZED VIEW mv_familias_geo_fuzzy IS 'Match por similaridade (pg_trgm): CEP na Geo + logradouro parecido. Tolerância a ortografia.';

-- Recriar a view para incluir o terceiro nível (fuzzy).
DROP VIEW IF EXISTS vw_familias_territorio CASCADE;
CREATE VIEW vw_familias_territorio AS
SELECT
  f.*,
  COALESCE(g1.cep_geo, g2.cep_geo, g3.cep_geo)             AS cep_territorio,
  COALESCE(g1.endereco_geo, g2.endereco_geo, g3.endereco_geo)   AS endereco_territorio,
  COALESCE(g1.bairro_geo, g2.bairro_geo, g3.bairro_geo)       AS bairro_territorio,
  COALESCE(g1.cras_geo, g2.cras_geo, g3.cras_geo)           AS cras_territorio,
  COALESCE(g1.creas_geo, g2.creas_geo, g3.creas_geo)         AS creas_territorio,
  COALESCE(g1.lat_geo, g2.lat_geo, g3.lat_geo)             AS lat_territorio,
  COALESCE(g1.long_geo, g2.long_geo, g3.long_geo)           AS long_territorio
FROM mv_familias_limpa f
LEFT JOIN mv_familias_geo g1 ON g1.d_cod_familiar_fam = f.d_cod_familiar_fam
LEFT JOIN mv_familias_geo_por_logradouro g2 ON g2.d_cod_familiar_fam = f.d_cod_familiar_fam
LEFT JOIN mv_familias_geo_fuzzy g3 ON g3.d_cod_familiar_fam = f.d_cod_familiar_fam;

COMMENT ON VIEW vw_familias_territorio IS 'Todas as famílias: território da Geo por match exato, só logradouro ou similaridade (fuzzy).';
