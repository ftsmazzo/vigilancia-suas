-- =============================================================================
-- ETAPA 2 – Índice e comentário na mv_familias_geo.
-- Rode DEPOIS que create_geo_match_step1.sql tiver terminado com sucesso.
-- =============================================================================

CREATE UNIQUE INDEX idx_mv_familias_geo_fam ON mv_familias_geo (d_cd_ibge, d_cod_familiar_fam);

COMMENT ON MATERIALIZED VIEW mv_familias_geo IS 'Famílias CADU com match seguro na Geo (CEP + logradouro). Geo = fonte da verdade para território. Refresh no painel após atualizar CADU ou Geo.';
