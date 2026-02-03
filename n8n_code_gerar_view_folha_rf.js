// =============================================================================
// N8N Code node: "Gerar View Folha RF" (materialized views)
// Saída: 1 item com { sql: "DROP ... CREATE MATERIALIZED VIEW ... CREATE VIEW ..." }
// O trabalho pesado roda no REFRESH; SELECT na vw_folha_rf fica rápido.
// Após criar: rodar refresh_folha_rf.sql (ou nó Postgres com REFRESH MATERIALIZED VIEW).
// =============================================================================

const sql = `DROP VIEW IF EXISTS vw_folha_rf CASCADE;
DROP MATERIALIZED VIEW IF EXISTS mv_folha_familias CASCADE;
DROP MATERIALIZED VIEW IF EXISTS mv_folha_canc CASCADE;
DROP MATERIALIZED VIEW IF EXISTS mv_folha_bloq CASCADE;
DROP MATERIALIZED VIEW IF EXISTS mv_folha_linhas CASCADE;
DROP MATERIALIZED VIEW IF EXISTS mv_folha_base CASCADE;

CREATE MATERIALIZED VIEW mv_folha_base AS
SELECT ibge, cod_familiar FROM (
  SELECT NULLIF(TRIM(ibge), '') AS ibge, NULLIF(TRIM(cod_familiar), '') AS cod_familiar
  FROM sibec_folha_pagamento
  WHERE NULLIF(TRIM(ibge), '') IS NOT NULL AND NULLIF(TRIM(cod_familiar), '') IS NOT NULL
  UNION
  SELECT NULLIF(TRIM(ibge), ''), NULLIF(TRIM(cod_familiar), '')
  FROM sibec_bloqueados
  WHERE NULLIF(TRIM(ibge), '') IS NOT NULL AND NULLIF(TRIM(cod_familiar), '') IS NOT NULL
  UNION
  SELECT NULLIF(TRIM(ibge), ''), NULLIF(TRIM(cod_familiar), '')
  FROM sibec_cancelados
  WHERE NULLIF(TRIM(ibge), '') IS NOT NULL AND NULLIF(TRIM(cod_familiar), '') IS NOT NULL
) t;
CREATE UNIQUE INDEX idx_mv_folha_base_key ON mv_folha_base (ibge, cod_familiar);

CREATE MATERIALIZED VIEW mv_folha_linhas AS
SELECT DISTINCT ON (ibge, cod_familiar)
  ibge, cod_familiar, ref_folha, cpf, nis, nome, NULLIF(TRIM(sitfam), '') AS sitfam
FROM (
  SELECT NULLIF(TRIM(ibge), '') AS ibge, NULLIF(TRIM(cod_familiar), '') AS cod_familiar, ref_folha, cpf, nis, nome, sitfam
  FROM sibec_folha_pagamento
  WHERE NULLIF(TRIM(ibge), '') IS NOT NULL AND NULLIF(TRIM(cod_familiar), '') IS NOT NULL
) t
ORDER BY ibge, cod_familiar, ref_folha DESC NULLS LAST;
CREATE UNIQUE INDEX idx_mv_folha_linhas_key ON mv_folha_linhas (ibge, cod_familiar);

CREATE MATERIALIZED VIEW mv_folha_bloq AS
SELECT ibge, cod_familiar, motivo FROM (
  SELECT NULLIF(TRIM(ibge), '') AS ibge, NULLIF(TRIM(cod_familiar), '') AS cod_familiar, motivo,
         ROW_NUMBER() OVER (PARTITION BY NULLIF(TRIM(ibge), ''), NULLIF(TRIM(cod_familiar), '') ORDER BY dt_hora_acao DESC NULLS LAST) AS rn
  FROM sibec_bloqueados
) t WHERE rn = 1;
CREATE UNIQUE INDEX idx_mv_folha_bloq_key ON mv_folha_bloq (ibge, cod_familiar);

CREATE MATERIALIZED VIEW mv_folha_canc AS
SELECT ibge, cod_familiar, motivo FROM (
  SELECT NULLIF(TRIM(ibge), '') AS ibge, NULLIF(TRIM(cod_familiar), '') AS cod_familiar, motivo,
         ROW_NUMBER() OVER (PARTITION BY NULLIF(TRIM(ibge), ''), NULLIF(TRIM(cod_familiar), '') ORDER BY dt_hora_acao DESC NULLS LAST) AS rn
  FROM sibec_cancelados
) t WHERE rn = 1;
CREATE UNIQUE INDEX idx_mv_folha_canc_key ON mv_folha_canc (ibge, cod_familiar);

CREATE MATERIALIZED VIEW mv_folha_familias AS
SELECT fam.d_cd_ibge AS ibge, fam.d_cod_familiar_fam AS cod_familiar,
  fam.d_nis_responsavel_fam,
  fam.d_nom_titulo_logradouro_fam, fam.d_nom_logradouro_fam, fam.d_num_logradouro_fam,
  fam.d_des_complemento_fam, fam.d_nom_unidade_territorial_fam, fam.d_num_cep_logradouro_fam,
  fam.d_num_ddd_contato_1_fam, fam.d_num_tel_contato_1_fam,
  COALESCE(rf.p_num_cpf_pessoa, pri.p_num_cpf_pessoa) AS rf_cpf,
  COALESCE(rf.p_nom_pessoa, pri.p_nom_pessoa) AS rf_nome,
  COALESCE(fam.d_nis_responsavel_fam, pri.p_num_nis_pessoa_atual) AS nis_fam
FROM vw_familias_limpa fam
LEFT JOIN vw_pessoas_limpa rf
  ON rf.d_cd_ibge = fam.d_cd_ibge AND rf.d_cod_familiar_fam = fam.d_cod_familiar_fam AND rf.p_cod_parentesco_rf_pessoa = 1
LEFT JOIN LATERAL (
  SELECT p_num_cpf_pessoa, p_nom_pessoa, p_num_nis_pessoa_atual
  FROM vw_pessoas_limpa p2
  WHERE p2.d_cd_ibge = fam.d_cd_ibge AND p2.d_cod_familiar_fam = fam.d_cod_familiar_fam
  ORDER BY p2.id LIMIT 1
) pri ON rf.p_num_cpf_pessoa IS NULL;
CREATE UNIQUE INDEX idx_mv_folha_familias_key ON mv_folha_familias (ibge, cod_familiar);

CREATE VIEW vw_folha_rf AS
SELECT fl.ref_folha, b.cod_familiar,
  COALESCE(fl.cpf, fam.rf_cpf) AS cpf,
  COALESCE(fl.nis, fam.nis_fam) AS nis,
  COALESCE(fl.nome, fam.rf_nome) AS nome,
  CASE WHEN c.motivo IS NOT NULL THEN 'CANCELADO' WHEN bl.motivo IS NOT NULL THEN 'BLOQUEADO' ELSE UPPER(COALESCE(fl.sitfam, 'LIBERADO')) END AS sit_fam,
  bl.motivo AS motivo_bloqueio, c.motivo AS motivo_cancelamento,
  NULLIF(TRIM(CONCAT_WS(' ', TRIM(fam.d_nom_titulo_logradouro_fam), TRIM(fam.d_nom_logradouro_fam), TRIM(fam.d_num_logradouro_fam), TRIM(fam.d_des_complemento_fam), TRIM(fam.d_nom_unidade_territorial_fam), TRIM(fam.d_num_cep_logradouro_fam))), '') AS endereco_cadu,
  NULLIF(TRIM(CONCAT_WS('', TRIM(fam.d_num_ddd_contato_1_fam), TRIM(fam.d_num_tel_contato_1_fam))), '') AS telefone_cadu
FROM mv_folha_base b
LEFT JOIN mv_folha_linhas fl ON fl.ibge = b.ibge AND fl.cod_familiar = b.cod_familiar
LEFT JOIN mv_folha_familias fam ON fam.ibge = b.ibge AND fam.cod_familiar = b.cod_familiar
LEFT JOIN mv_folha_bloq bl ON bl.ibge = b.ibge AND bl.cod_familiar = b.cod_familiar
LEFT JOIN mv_folha_canc c ON c.ibge = b.ibge AND c.cod_familiar = b.cod_familiar;`;

return [{ json: { sql } }];
