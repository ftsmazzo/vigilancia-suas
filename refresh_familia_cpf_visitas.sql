-- =============================================================================
-- Refresh das materialized views Família + CPF→Visitas
-- Rodar APÓS carregar Folha/Bloqueados/Cancelados/CADU (ou quando quiser atualizar).
-- Ordem: mv_familia_situacao primeiro (mv_cpf_familia_situacao depende dela).
-- =============================================================================

REFRESH MATERIALIZED VIEW mv_familia_situacao;
REFRESH MATERIALIZED VIEW mv_cpf_familia_situacao;
