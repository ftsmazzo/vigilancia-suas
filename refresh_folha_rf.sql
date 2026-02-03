-- =============================================================================
-- Refresh das materialized views Folha RF
-- Rodar APÓS carregar Folha/Bloqueados/Cancelados/CADU (ou quando quiser atualizar).
-- CONCURRENTLY = não bloqueia leituras (exige UNIQUE INDEX em cada MV).
-- =============================================================================

REFRESH MATERIALIZED VIEW CONCURRENTLY mv_folha_base;
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_folha_linhas;
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_folha_bloq;
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_folha_canc;
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_folha_familias;
