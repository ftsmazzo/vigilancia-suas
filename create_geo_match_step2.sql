-- =============================================================================
-- ETAPA 2 – Índice e comentário na mv_familias_geo.
-- Rode DEPOIS que create_geo_match_step1.sql tiver terminado com sucesso.
-- =============================================================================

CREATE UNIQUE INDEX idx_mv_familias_geo_fam ON mv_familias_geo (d_cd_ibge, d_cod_familiar_fam);

COMMENT ON MATERIALIZED VIEW mv_familias_geo IS 'Famílias CADU com match na Geo (CEP + logradouro). Só entra quem bate na Geo. Traz cep_geo, endereco_geo, bairro_geo, cras_geo, creas_geo, lat_geo, long_geo. Cruzamento: famílias/pessoas por código familiar com mv_familias_geo. Via CEP/estratégias atualizam tbl_geo; refresh agrega mais famílias.';
