-- =============================================================================
-- mv_familias_limpa: cópia materializada de vw_familias_limpa.
-- Uso: Power BI e qualquer leitura pesada. vw_familias_limpa é lenta (DISTINCT ON
-- + subconsulta correlacionada); esta MV evita recalcular a cada consulta.
-- Rodar UMA VEZ após create_views_cadu.sql. Depois: refresh no "Atualizar todas as views".
-- =============================================================================

DROP MATERIALIZED VIEW IF EXISTS mv_familias_limpa CASCADE;

CREATE MATERIALIZED VIEW mv_familias_limpa AS
SELECT * FROM vw_familias_limpa;

CREATE UNIQUE INDEX idx_mv_familias_limpa_fam ON mv_familias_limpa (d_cd_ibge, d_cod_familiar_fam);

COMMENT ON MATERIALIZED VIEW mv_familias_limpa IS 'Cópia de vw_familias_limpa para leitura rápida (Power BI, etc.). Refresh após upload CADU.';
