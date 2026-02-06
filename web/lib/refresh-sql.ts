/**
 * Scripts SQL de refresh para execução via API (admin).
 * Mantidos em sync com os arquivos .sql do projeto.
 */

export const REFRESH_FAMILIA_CPF_VISITAS = `
REFRESH MATERIALIZED VIEW mv_familia_situacao;
REFRESH MATERIALIZED VIEW mv_cpf_familia_situacao;
`.trim();

export const REFRESH_FOLHA_RF = `
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_folha_base;
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_folha_linhas;
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_folha_bloq;
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_folha_canc;
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_folha_familias;
`.trim();

export const REFRESH_GEO = `
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_familias_limpa;
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_familias_geo;
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_familias_geo_por_logradouro;
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_familias_geo_fuzzy;
`.trim();

export type RefreshAction = 'familia_cpf_visitas' | 'folha_rf' | 'geo' | 'todas';

export function getRefreshSql(action: RefreshAction): string[] {
  switch (action) {
    case 'familia_cpf_visitas':
      return REFRESH_FAMILIA_CPF_VISITAS.split(';').map((s) => s.trim()).filter(Boolean);
    case 'folha_rf':
      return REFRESH_FOLHA_RF.split(';').map((s) => s.trim()).filter(Boolean);
    case 'geo':
      return REFRESH_GEO.split(';').map((s) => s.trim()).filter(Boolean);
    case 'todas':
      return [
        ...REFRESH_FAMILIA_CPF_VISITAS.split(';').map((s) => s.trim()).filter(Boolean),
        ...REFRESH_FOLHA_RF.split(';').map((s) => s.trim()).filter(Boolean),
        ...REFRESH_GEO.split(';').map((s) => s.trim()).filter(Boolean),
      ];
    default:
      return [];
  }
}
