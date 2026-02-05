-- =============================================================================
-- ETAPA 2 – Índice e comentário na mv_familias_geo.
-- Rode DEPOIS que create_geo_match_step1.sql tiver terminado com sucesso.
-- =============================================================================

CREATE UNIQUE INDEX idx_mv_familias_geo_fam ON mv_familias_geo (d_cd_ibge, d_cod_familiar_fam);
CREATE UNIQUE INDEX idx_mv_familias_geo_logradouro_fam ON mv_familias_geo_por_logradouro (d_cd_ibge, d_cod_familiar_fam);

COMMENT ON MATERIALIZED VIEW mv_familias_geo IS 'Famílias CADU com match na Geo (CEP + logradouro). Só entra quem bate na Geo. Traz cep_geo, endereco_geo, bairro_geo, cras_geo, creas_geo, lat_geo, long_geo. Via CEP/estratégias atualizam tbl_geo; refresh agrega mais famílias.';
COMMENT ON MATERIALIZED VIEW mv_familias_geo_por_logradouro IS 'Só candidatos (CEP na Geo, sem match CEP+logradouro): match por logradouro. Corrige CEP genérico; execução rápida.';

DROP VIEW IF EXISTS vw_familias_territorio CASCADE;
CREATE VIEW vw_familias_territorio AS
SELECT
  f.*,
  COALESCE(g1.cep_geo, g2.cep_geo)             AS cep_territorio,
  COALESCE(g1.endereco_geo, g2.endereco_geo)   AS endereco_territorio,
  COALESCE(g1.bairro_geo, g2.bairro_geo)       AS bairro_territorio,
  COALESCE(g1.cras_geo, g2.cras_geo)           AS cras_territorio,
  COALESCE(g1.creas_geo, g2.creas_geo)         AS creas_territorio,
  COALESCE(g1.lat_geo, g2.lat_geo)             AS lat_territorio,
  COALESCE(g1.long_geo, g2.long_geo)           AS long_territorio
FROM mv_familias_limpa f
LEFT JOIN mv_familias_geo g1 ON g1.d_cd_ibge = f.d_cd_ibge AND g1.d_cod_familiar_fam = f.d_cod_familiar_fam
LEFT JOIN mv_familias_geo_por_logradouro g2 ON g2.d_cd_ibge = f.d_cd_ibge AND g2.d_cod_familiar_fam = f.d_cod_familiar_fam;

COMMENT ON VIEW vw_familias_territorio IS 'Todas as famílias: território da Geo por match CEP+logradouro ou só logradouro (CEP corrigido). Sem alterar cadastro. Use esta view no sistema.';
