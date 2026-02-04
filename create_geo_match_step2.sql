-- =============================================================================
-- ETAPA 2 – Índice e comentário na mv_familias_geo.
-- Rode DEPOIS que create_geo_match_step1.sql tiver terminado com sucesso.
-- =============================================================================

CREATE UNIQUE INDEX idx_mv_familias_geo_fam ON mv_familias_geo (d_cd_ibge, d_cod_familiar_fam);

COMMENT ON MATERIALIZED VIEW mv_familias_geo IS 'Famílias CADU com match na Geo (CEP + logradouro). Só entra quem bate na Geo. Traz cep_geo, endereco_geo, bairro_geo, cras_geo, creas_geo, lat_geo, long_geo. Via CEP/estratégias atualizam tbl_geo; refresh agrega mais famílias.';

DROP VIEW IF EXISTS vw_familias_territorio CASCADE;
CREATE VIEW vw_familias_territorio AS
SELECT
  f.*,
  g.cep_geo             AS cep_territorio,
  g.endereco_geo         AS endereco_territorio,
  g.bairro_geo           AS bairro_territorio,
  g.cras_geo             AS cras_territorio,
  g.creas_geo            AS creas_territorio,
  g.lat_geo              AS lat_territorio,
  g.long_geo             AS long_territorio
FROM vw_familias_limpa f
LEFT JOIN mv_familias_geo g ON g.d_cd_ibge = f.d_cd_ibge AND g.d_cod_familiar_fam = f.d_cod_familiar_fam;

COMMENT ON VIEW vw_familias_territorio IS 'Todas as famílias do CADU com território corrigido da Geo quando há match. Use esta view no sistema; não é preciso JOIN.';
