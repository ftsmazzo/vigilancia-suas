/**
 * Scripts SQL embutidos para os botões "Criar/recriar" na Manutenção.
 * Funcionam após deploy (Docker, etc.) sem depender de arquivos .sql no disco.
 * Manter em sync com: create_views_cadu.sql, create_mv_familias_limpa.sql,
 * create_view_folha_rf.sql, create_view_familia_cpf_visitas.sql.
 */

// Views CADU: funções norm_* + vw_familias_limpa + vw_pessoas_limpa (regex com \\d para Postgres receber \d)
export const SQL_VIEWS_CADU = `
-- Views mestres CADU (Vigilância) – família (d_) e pessoa (p_)
CREATE OR REPLACE FUNCTION norm_text(t TEXT) RETURNS TEXT AS $$
  SELECT NULLIF(TRIM(t), '');
$$ LANGUAGE SQL IMMUTABLE;

CREATE OR REPLACE FUNCTION norm_cpf(t TEXT) RETURNS TEXT AS $$
  SELECT CASE
    WHEN NULLIF(TRIM(t), '') IS NULL THEN NULL
    ELSE LPAD(LEFT(REGEXP_REPLACE(t, '[^0-9]', '', 'g'), 11), 11, '0')
  END;
$$ LANGUAGE SQL IMMUTABLE;

CREATE OR REPLACE FUNCTION norm_nis(t TEXT) RETURNS TEXT AS $$
  SELECT CASE
    WHEN NULLIF(TRIM(t), '') IS NULL THEN NULL
    ELSE LPAD(LEFT(REGEXP_REPLACE(t, '[^0-9]', '', 'g'), 11), 11, '0')
  END;
$$ LANGUAGE SQL IMMUTABLE;

CREATE OR REPLACE FUNCTION norm_cep(t TEXT) RETURNS TEXT AS $$
  SELECT CASE
    WHEN NULLIF(TRIM(t), '') IS NULL THEN NULL
    ELSE LPAD(LEFT(REGEXP_REPLACE(t, '[^0-9]', '', 'g'), 8), 8, '0')
  END;
$$ LANGUAGE SQL IMMUTABLE;

CREATE OR REPLACE FUNCTION norm_phone(t TEXT) RETURNS TEXT AS $$
  SELECT CASE
    WHEN NULLIF(TRIM(t), '') IS NULL THEN NULL
    ELSE REGEXP_REPLACE(t, '[^0-9]', '', 'g')
  END;
$$ LANGUAGE SQL IMMUTABLE;

CREATE OR REPLACE FUNCTION norm_date(t TEXT) RETURNS DATE AS $$
  SELECT CASE
    WHEN NULLIF(TRIM(t), '') IS NULL THEN NULL
    WHEN TRIM(t) ~ '^\\d{2}/\\d{2}/\\d{4}$' THEN TO_DATE(TRIM(t), 'DD/MM/YYYY')
    WHEN TRIM(t) ~ '^\\d{8}$' THEN TO_DATE(TRIM(t), 'DDMMYYYY')
    WHEN TRIM(t) ~ '^\\d{4}-\\d{2}-\\d{2}$' THEN TO_DATE(TRIM(t), 'YYYY-MM-DD')
    ELSE NULL
  END;
$$ LANGUAGE SQL IMMUTABLE;

CREATE OR REPLACE FUNCTION norm_num(t TEXT) RETURNS NUMERIC AS $$
  SELECT CASE
    WHEN NULLIF(TRIM(t), '') IS NULL THEN NULL
    WHEN TRIM(t) ~ '^-?[\\d,.]+$' THEN REPLACE(REPLACE(TRIM(t), '.', ''), ',', '.')::NUMERIC
    ELSE NULL
  END;
$$ LANGUAGE SQL IMMUTABLE;

CREATE OR REPLACE FUNCTION norm_int(t TEXT) RETURNS INTEGER AS $$
  SELECT CASE
    WHEN NULLIF(TRIM(t), '') IS NULL THEN NULL
    WHEN TRIM(t) ~ '^-?\\d+$' THEN TRIM(t)::INTEGER
    ELSE NULL
  END;
$$ LANGUAGE SQL IMMUTABLE;

CREATE OR REPLACE FUNCTION norm_cod_familiar(t TEXT) RETURNS TEXT AS $$
  SELECT NULLIF(LTRIM(TRIM(COALESCE(t, '')), '0'), '');
$$ LANGUAGE SQL IMMUTABLE;

DROP VIEW IF EXISTS vw_pessoas_limpa CASCADE;
DROP VIEW IF EXISTS vw_familias_limpa CASCADE;
DROP VIEW IF EXISTS v_cadu_pessoas CASCADE;
DROP VIEW IF EXISTS v_cadu_familias CASCADE;

CREATE VIEW vw_familias_limpa AS
SELECT DISTINCT ON (norm_cod_familiar(r.d_cod_familiar_fam))
    norm_cod_familiar(r.d_cod_familiar_fam) AS d_cod_familiar_fam,
    norm_date(r.d_dat_cadastramento_fam) AS d_dat_cadastramento_fam,
    norm_date(r.d_dat_atual_fam) AS d_dat_atual_fam,
    norm_int(r.d_cod_est_cadastral_fam) AS d_cod_est_cadastral_fam,
    norm_int(r.d_cod_forma_coleta_fam) AS d_cod_forma_coleta_fam,
    norm_date(r.d_dta_entrevista_fam) AS d_dta_entrevista_fam,
    norm_text(r.d_nom_localidade_fam) AS d_nom_localidade_fam,
    norm_text(r.d_nom_tip_logradouro_fam) AS d_nom_tip_logradouro_fam,
    norm_text(r.d_nom_titulo_logradouro_fam) AS d_nom_titulo_logradouro_fam,
    norm_text(r.d_nom_logradouro_fam) AS d_nom_logradouro_fam,
    norm_text(r.d_num_logradouro_fam) AS d_num_logradouro_fam,
    norm_text(r.d_des_complemento_fam) AS d_des_complemento_fam,
    norm_text(r.d_des_complemento_adic_fam) AS d_des_complemento_adic_fam,
    norm_cep(r.d_num_cep_logradouro_fam) AS d_num_cep_logradouro_fam,
    norm_text(r.d_cod_unidade_territorial_fam) AS d_cod_unidade_territorial_fam,
    norm_text(r.d_nom_unidade_territorial_fam) AS d_nom_unidade_territorial_fam,
    norm_text(r.d_txt_referencia_local_fam) AS d_txt_referencia_local_fam,
    norm_num(r.d_vlr_renda_media_fam) AS d_vlr_renda_media_fam,
    norm_int(r.d_fx_rfpc) AS d_fx_rfpc,
    norm_num(r.d_vlr_renda_total_fam) AS d_vlr_renda_total_fam,
    norm_int(r.d_marc_pbf) AS d_marc_pbf,
    norm_int(r.d_cod_local_domic_fam) AS d_cod_local_domic_fam,
    norm_int(r.d_cod_especie_domic_fam) AS d_cod_especie_domic_fam,
    norm_int(r.d_qtd_comodos_domic_fam) AS d_qtd_comodos_domic_fam,
    norm_int(r.d_qtd_comodos_dormitorio_fam) AS d_qtd_comodos_dormitorio_fam,
    norm_int(r.d_cod_material_piso_fam) AS d_cod_material_piso_fam,
    norm_int(r.d_cod_material_domic_fam) AS d_cod_material_domic_fam,
    norm_int(r.d_cod_agua_canalizada_fam) AS d_cod_agua_canalizada_fam,
    norm_int(r.d_cod_abaste_agua_domic_fam) AS d_cod_abaste_agua_domic_fam,
    norm_int(r.d_cod_banheiro_domic_fam) AS d_cod_banheiro_domic_fam,
    norm_int(r.d_cod_escoa_sanitario_domic_fam) AS d_cod_escoa_sanitario_domic_fam,
    norm_int(r.d_cod_destino_lixo_domic_fam) AS d_cod_destino_lixo_domic_fam,
    norm_int(r.d_cod_iluminacao_domic_fam) AS d_cod_iluminacao_domic_fam,
    norm_int(r.d_cod_calcamento_domic_fam) AS d_cod_calcamento_domic_fam,
    norm_int(r.d_cod_familia_indigena_fam) AS d_cod_familia_indigena_fam,
    norm_text(r.d_cod_povo_indigena_fam) AS d_cod_povo_indigena_fam,
    norm_text(r.d_nom_povo_indigena_fam) AS d_nom_povo_indigena_fam,
    norm_int(r.d_cod_indigena_reside_fam) AS d_cod_indigena_reside_fam,
    norm_text(r.d_cod_reserva_indigena_fam) AS d_cod_reserva_indigena_fam,
    norm_text(r.d_nom_reserva_indigena_fam) AS d_nom_reserva_indigena_fam,
    norm_text(r.d_ind_familia_quilombola_fam) AS d_ind_familia_quilombola_fam,
    norm_text(r.d_cod_comunidade_quilombola_fam) AS d_cod_comunidade_quilombola_fam,
    norm_text(r.d_nom_comunidade_quilombola_fam) AS d_nom_comunidade_quilombola_fam,
    norm_int(r.d_qtd_pessoas_domic_fam) AS d_qtd_pessoas_domic_fam,
    norm_int(r.d_qtd_familias_domic_fam) AS d_qtd_familias_domic_fam,
    norm_num(r.d_val_desp_energia_fam) AS d_val_desp_energia_fam,
    norm_num(r.d_val_desp_agua_esgoto_fam) AS d_val_desp_agua_esgoto_fam,
    norm_num(r.d_val_desp_gas_fam) AS d_val_desp_gas_fam,
    norm_num(r.d_val_desp_alimentacao_fam) AS d_val_desp_alimentacao_fam,
    norm_num(r.d_val_desp_transpor_fam) AS d_val_desp_transpor_fam,
    norm_num(r.d_val_desp_aluguel_fam) AS d_val_desp_aluguel_fam,
    norm_num(r.d_val_desp_medicamentos_fam) AS d_val_desp_medicamentos_fam,
    norm_text(r.d_nom_estab_assist_saude_fam) AS d_nom_estab_assist_saude_fam,
    norm_text(r.d_cod_eas_fam) AS d_cod_eas_fam,
    norm_text(r.d_nom_centro_assist_fam) AS d_nom_centro_assist_fam,
    norm_text(r.d_cod_centro_assist_fam) AS d_cod_centro_assist_fam,
    norm_text(r.d_ind_risco_scl_vlco_drts) AS d_ind_risco_scl_vlco_drts,
    norm_int(r.d_ind_risco_scl_inseg_alim) AS d_ind_risco_scl_inseg_alim,
    norm_phone(r.d_num_ddd_contato_1_fam) AS d_num_ddd_contato_1_fam,
    norm_phone(r.d_num_tel_contato_1_fam) AS d_num_tel_contato_1_fam,
    norm_text(r.d_ind_parc_mds_fam) AS d_ind_parc_mds_fam,
    norm_text(r.d_ref_cad) AS d_ref_cad,
    norm_text(r.d_ref_pbf) AS d_ref_pbf
FROM cadu_raw r
ORDER BY norm_cod_familiar(r.d_cod_familiar_fam), r.id;

CREATE VIEW vw_pessoas_limpa AS
SELECT
    r.id,
    r.created_at,
    norm_cod_familiar(r.p_cod_familiar_fam) AS p_cod_familiar_fam,
    norm_int(r.p_cod_est_cadastral_memb) AS p_cod_est_cadastral_memb,
    norm_int(r.p_ind_trabalho_infantil_pessoa) AS p_ind_trabalho_infantil_pessoa,
    norm_text(r.p_nom_pessoa) AS p_nom_pessoa,
    norm_nis(r.p_num_nis_pessoa_atual) AS p_num_nis_pessoa_atual,
    norm_cpf(r.p_num_cpf_pessoa) AS p_num_cpf_pessoa,
    norm_int(r.p_cod_sexo_pessoa) AS p_cod_sexo_pessoa,
    norm_date(r.p_dta_nasc_pessoa) AS p_dta_nasc_pessoa,
    norm_int(r.p_cod_parentesco_rf_pessoa) AS p_cod_parentesco_rf_pessoa,
    norm_int(r.p_cod_raca_cor_pessoa) AS p_cod_raca_cor_pessoa,
    norm_text(r.p_nom_completo_mae_pessoa) AS p_nom_completo_mae_pessoa,
    norm_text(r.p_nom_completo_pai_pessoa) AS p_nom_completo_pai_pessoa,
    norm_int(r.p_cod_local_nascimento_pessoa) AS p_cod_local_nascimento_pessoa,
    norm_text(r.p_sig_uf_munic_nasc_pessoa) AS p_sig_uf_munic_nasc_pessoa,
    norm_text(r.p_nom_ibge_munic_nasc_pessoa) AS p_nom_ibge_munic_nasc_pessoa,
    norm_text(r.p_cod_ibge_munic_nasc_pessoa) AS p_cod_ibge_munic_nasc_pessoa,
    norm_text(r.p_nom_pais_origem_pessoa) AS p_nom_pais_origem_pessoa,
    norm_text(r.p_cod_pais_origem_pessoa) AS p_cod_pais_origem_pessoa,
    norm_int(r.p_ind_identidade_genero) AS p_ind_identidade_genero,
    norm_int(r.p_ind_transgenero) AS p_ind_transgenero,
    norm_int(r.p_ind_tipo_identidade_genero) AS p_ind_tipo_identidade_genero,
    norm_int(r.p_cod_deficiencia_memb) AS p_cod_deficiencia_memb,
    norm_int(r.p_ind_def_cegueira_memb) AS p_ind_def_cegueira_memb,
    norm_int(r.p_ind_def_baixa_visao_memb) AS p_ind_def_baixa_visao_memb,
    norm_int(r.p_ind_def_surdez_profunda_memb) AS p_ind_def_surdez_profunda_memb,
    norm_int(r.p_ind_def_surdez_leve_memb) AS p_ind_def_surdez_leve_memb,
    norm_int(r.p_ind_def_fisica_memb) AS p_ind_def_fisica_memb,
    norm_int(r.p_ind_def_mental_memb) AS p_ind_def_mental_memb,
    norm_int(r.p_ind_def_sindrome_down_memb) AS p_ind_def_sindrome_down_memb,
    norm_int(r.p_ind_def_transtorno_mental_memb) AS p_ind_def_transtorno_mental_memb,
    norm_int(r.p_ind_ajuda_nao_memb) AS p_ind_ajuda_nao_memb,
    norm_int(r.p_ind_ajuda_familia_memb) AS p_ind_ajuda_familia_memb,
    norm_int(r.p_ind_ajuda_especializado_memb) AS p_ind_ajuda_especializado_memb,
    norm_int(r.p_ind_ajuda_vizinho_memb) AS p_ind_ajuda_vizinho_memb,
    norm_int(r.p_ind_ajuda_instituicao_memb) AS p_ind_ajuda_instituicao_memb,
    norm_int(r.p_ind_ajuda_outra_memb) AS p_ind_ajuda_outra_memb,
    norm_int(r.p_cod_sabe_ler_escrever_memb) AS p_cod_sabe_ler_escrever_memb,
    norm_int(r.p_ind_frequenta_escola_memb) AS p_ind_frequenta_escola_memb,
    norm_int(r.p_cod_curso_frequenta_memb) AS p_cod_curso_frequenta_memb,
    norm_int(r.p_cod_ano_serie_frequenta_memb) AS p_cod_ano_serie_frequenta_memb,
    norm_int(r.p_cod_curso_frequentou_pessoa_memb) AS p_cod_curso_frequentou_pessoa_memb,
    norm_int(r.p_cod_ano_serie_frequentou_memb) AS p_cod_ano_serie_frequentou_memb,
    norm_int(r.p_cod_concluiu_frequentou_memb) AS p_cod_concluiu_frequentou_memb,
    norm_text(r.p_grau_instrucao) AS p_grau_instrucao,
    norm_int(r.p_cod_trabalhou_memb) AS p_cod_trabalhou_memb,
    norm_int(r.p_cod_afastado_trab_memb) AS p_cod_afastado_trab_memb,
    norm_int(r.p_cod_agricultura_trab_memb) AS p_cod_agricultura_trab_memb,
    norm_int(r.p_cod_principal_trab_memb) AS p_cod_principal_trab_memb,
    norm_int(r.p_cod_trabalho_12_meses_memb) AS p_cod_trabalho_12_meses_memb,
    norm_int(r.p_qtd_meses_12_meses_memb) AS p_qtd_meses_12_meses_memb,
    norm_text(r.p_fx_renda_individual_805) AS p_fx_renda_individual_805,
    norm_text(r.p_fx_renda_individual_808) AS p_fx_renda_individual_808,
    norm_text(r.p_fx_renda_individual_809_1) AS p_fx_renda_individual_809_1,
    norm_text(r.p_fx_renda_individual_809_2) AS p_fx_renda_individual_809_2,
    norm_text(r.p_fx_renda_individual_809_3) AS p_fx_renda_individual_809_3,
    norm_text(r.p_fx_renda_individual_809_4) AS p_fx_renda_individual_809_4,
    norm_text(r.p_fx_renda_individual_809_5) AS p_fx_renda_individual_809_5,
    norm_int(r.p_marc_sit_rua) AS p_marc_sit_rua,
    norm_int(r.p_ind_dormir_rua_memb) AS p_ind_dormir_rua_memb,
    norm_int(r.p_qtd_dormir_freq_rua_memb) AS p_qtd_dormir_freq_rua_memb,
    norm_int(r.p_ind_dormir_albergue_memb) AS p_ind_dormir_albergue_memb,
    norm_int(r.p_qtd_dormir_freq_albergue_memb) AS p_qtd_dormir_freq_albergue_memb,
    norm_int(r.p_ind_dormir_dom_part_memb) AS p_ind_dormir_dom_part_memb,
    norm_int(r.p_qtd_dormir_freq_dom_part_memb) AS p_qtd_dormir_freq_dom_part_memb,
    norm_int(r.p_ind_outro_memb) AS p_ind_outro_memb,
    norm_int(r.p_qtd_freq_outro_memb) AS p_qtd_freq_outro_memb,
    norm_int(r.p_cod_tempo_rua_memb) AS p_cod_tempo_rua_memb,
    norm_int(r.p_ind_motivo_perda_memb) AS p_ind_motivo_perda_memb,
    norm_int(r.p_ind_motivo_ameaca_memb) AS p_ind_motivo_ameaca_memb,
    norm_int(r.p_ind_motivo_probs_fam_memb) AS p_ind_motivo_probs_fam_memb,
    norm_int(r.p_ind_motivo_alcool_memb) AS p_ind_motivo_alcool_memb,
    norm_int(r.p_ind_motivo_desemprego_memb) AS p_ind_motivo_desemprego_memb,
    norm_int(r.p_ind_motivo_trabalho_memb) AS p_ind_motivo_trabalho_memb,
    norm_int(r.p_ind_motivo_saude_memb) AS p_ind_motivo_saude_memb,
    norm_int(r.p_ind_motivo_pref_memb) AS p_ind_motivo_pref_memb,
    norm_int(r.p_ind_motivo_outro_memb) AS p_ind_motivo_outro_memb,
    norm_int(r.p_ind_motivo_nao_sabe_memb) AS p_ind_motivo_nao_sabe_memb,
    norm_int(r.p_ind_motivo_nao_resp_memb) AS p_ind_motivo_nao_resp_memb,
    norm_int(r.p_cod_tempo_cidade_memb) AS p_cod_tempo_cidade_memb,
    norm_int(r.p_cod_vive_fam_rua_memb) AS p_cod_vive_fam_rua_memb,
    norm_int(r.p_cod_contato_parente_memb) AS p_cod_contato_parente_memb,
    norm_int(r.p_ind_ativ_com_escola_memb) AS p_ind_ativ_com_escola_memb,
    norm_int(r.p_ind_ativ_com_coop_memb) AS p_ind_ativ_com_coop_memb,
    norm_int(r.p_ind_ativ_com_mov_soc_memb) AS p_ind_ativ_com_mov_soc_memb,
    norm_int(r.p_ind_ativ_com_nao_sabe_memb) AS p_ind_ativ_com_nao_sabe_memb,
    norm_int(r.p_ind_ativ_com_nao_resp_memb) AS p_ind_ativ_com_nao_resp_memb,
    norm_int(r.p_ind_atend_cras_memb) AS p_ind_atend_cras_memb,
    norm_int(r.p_ind_atend_creas_memb) AS p_ind_atend_creas_memb,
    norm_int(r.p_ind_atend_centro_ref_rua_memb) AS p_ind_atend_centro_ref_rua_memb,
    norm_int(r.p_ind_atend_inst_gov_memb) AS p_ind_atend_inst_gov_memb,
    norm_int(r.p_ind_atend_inst_nao_gov_memb) AS p_ind_atend_inst_nao_gov_memb,
    norm_int(r.p_ind_atend_hospital_geral_memb) AS p_ind_atend_hospital_geral_memb,
    norm_int(r.p_cod_cart_assinada_memb) AS p_cod_cart_assinada_memb,
    norm_int(r.p_ind_dinh_const_memb) AS p_ind_dinh_const_memb,
    norm_int(r.p_ind_dinh_flanelhinha_memb) AS p_ind_dinh_flanelhinha_memb,
    norm_int(r.p_ind_dinh_carregador_memb) AS p_ind_dinh_carregador_memb,
    norm_int(r.p_ind_dinh_catador_memb) AS p_ind_dinh_catador_memb,
    norm_int(r.p_ind_dinh_servs_gerais_memb) AS p_ind_dinh_servs_gerais_memb,
    norm_int(r.p_ind_dinh_pede_memb) AS p_ind_dinh_pede_memb,
    norm_int(r.p_ind_dinh_vendas_memb) AS p_ind_dinh_vendas_memb,
    norm_int(r.p_ind_dinh_outro_memb) AS p_ind_dinh_outro_memb,
    norm_int(r.p_ind_dinh_nao_resp_memb) AS p_ind_dinh_nao_resp_memb,
    norm_int(r.p_ind_atend_nenhum_memb) AS p_ind_atend_nenhum_memb
FROM cadu_raw r;

COMMENT ON VIEW vw_familias_limpa IS 'Uma linha por família (CADU). Chave: d_cod_familiar_fam. Uso: um município. Colunas d_* essenciais normalizadas. Recriar a cada upload.';
COMMENT ON VIEW vw_pessoas_limpa IS 'Uma linha por pessoa (CADU). Chave família: p_cod_familiar_fam. Sem IBGE, sem certidão/documentos. Colunas p_* essenciais normalizadas. Recriar a cada upload.';
`.trim();

export const SQL_MV_FAMILIAS_LIMPA = `
DROP MATERIALIZED VIEW IF EXISTS mv_familias_limpa CASCADE;

CREATE MATERIALIZED VIEW mv_familias_limpa AS
SELECT * FROM vw_familias_limpa;

CREATE UNIQUE INDEX idx_mv_familias_limpa_fam ON mv_familias_limpa (d_cod_familiar_fam);

COMMENT ON MATERIALIZED VIEW mv_familias_limpa IS 'Cópia de vw_familias_limpa para leitura rápida (Power BI, etc.). Refresh após upload CADU.';
`.trim();

export const SQL_FOLHA_RF = `
DROP VIEW IF EXISTS vw_folha_rf CASCADE;
DROP MATERIALIZED VIEW IF EXISTS mv_folha_familias CASCADE;
DROP MATERIALIZED VIEW IF EXISTS mv_folha_canc CASCADE;
DROP MATERIALIZED VIEW IF EXISTS mv_folha_bloq CASCADE;
DROP MATERIALIZED VIEW IF EXISTS mv_folha_linhas CASCADE;
DROP MATERIALIZED VIEW IF EXISTS mv_folha_base CASCADE;

CREATE MATERIALIZED VIEW mv_folha_base AS
SELECT ibge, cod_familiar FROM (
  SELECT NULLIF(TRIM(ibge), '') AS ibge, norm_cod_familiar(cod_familiar) AS cod_familiar
  FROM sibec_folha_pagamento
  WHERE NULLIF(TRIM(ibge), '') IS NOT NULL AND norm_cod_familiar(cod_familiar) IS NOT NULL
  UNION
  SELECT NULLIF(TRIM(ibge), ''), norm_cod_familiar(cod_familiar)
  FROM sibec_bloqueados
  WHERE NULLIF(TRIM(ibge), '') IS NOT NULL AND norm_cod_familiar(cod_familiar) IS NOT NULL
  UNION
  SELECT NULLIF(TRIM(ibge), ''), norm_cod_familiar(cod_familiar)
  FROM sibec_cancelados
  WHERE NULLIF(TRIM(ibge), '') IS NOT NULL AND norm_cod_familiar(cod_familiar) IS NOT NULL
) t;

CREATE UNIQUE INDEX idx_mv_folha_base_key ON mv_folha_base (ibge, cod_familiar);
COMMENT ON MATERIALIZED VIEW mv_folha_base IS 'Chave (ibge, cod_familiar) distinta: Folha + Bloqueados + Cancelados.';

CREATE MATERIALIZED VIEW mv_folha_linhas AS
SELECT DISTINCT ON (ibge, cod_familiar)
  ibge, cod_familiar, ref_folha, cpf, nis, nome, NULLIF(TRIM(sitfam), '') AS sitfam
FROM (
  SELECT
    NULLIF(TRIM(ibge), '')       AS ibge,
    norm_cod_familiar(cod_familiar) AS cod_familiar,
    ref_folha, cpf, nis, nome, sitfam
  FROM sibec_folha_pagamento
  WHERE NULLIF(TRIM(ibge), '') IS NOT NULL AND norm_cod_familiar(cod_familiar) IS NOT NULL
) t
ORDER BY ibge, cod_familiar, ref_folha DESC NULLS LAST;

CREATE UNIQUE INDEX idx_mv_folha_linhas_key ON mv_folha_linhas (ibge, cod_familiar);
COMMENT ON MATERIALIZED VIEW mv_folha_linhas IS 'Uma linha por (ibge, cod_familiar) na Folha (ref_folha mais recente).';

CREATE MATERIALIZED VIEW mv_folha_bloq AS
SELECT ibge, cod_familiar, motivo FROM (
  SELECT
    NULLIF(TRIM(ibge), '')       AS ibge,
    norm_cod_familiar(cod_familiar) AS cod_familiar,
    motivo,
    ROW_NUMBER() OVER (PARTITION BY NULLIF(TRIM(ibge), ''), norm_cod_familiar(cod_familiar) ORDER BY dt_hora_acao DESC NULLS LAST) AS rn
  FROM sibec_bloqueados
) t
WHERE rn = 1;

CREATE UNIQUE INDEX idx_mv_folha_bloq_key ON mv_folha_bloq (ibge, cod_familiar);
COMMENT ON MATERIALIZED VIEW mv_folha_bloq IS 'Um registro por família em Bloqueados (motivo mais recente).';

CREATE MATERIALIZED VIEW mv_folha_canc AS
SELECT ibge, cod_familiar, motivo FROM (
  SELECT
    NULLIF(TRIM(ibge), '')       AS ibge,
    norm_cod_familiar(cod_familiar) AS cod_familiar,
    motivo,
    ROW_NUMBER() OVER (PARTITION BY NULLIF(TRIM(ibge), ''), norm_cod_familiar(cod_familiar) ORDER BY dt_hora_acao DESC NULLS LAST) AS rn
  FROM sibec_cancelados
) t
WHERE rn = 1;

CREATE UNIQUE INDEX idx_mv_folha_canc_key ON mv_folha_canc (ibge, cod_familiar);
COMMENT ON MATERIALIZED VIEW mv_folha_canc IS 'Um registro por família em Cancelados (motivo mais recente).';

CREATE MATERIALIZED VIEW mv_folha_familias AS
SELECT
  fam.d_cod_familiar_fam               AS cod_familiar,
  fam.d_nom_titulo_logradouro_fam,
  fam.d_nom_logradouro_fam,
  fam.d_num_logradouro_fam,
  fam.d_des_complemento_fam,
  fam.d_nom_unidade_territorial_fam,
  fam.d_num_cep_logradouro_fam,
  fam.d_num_ddd_contato_1_fam,
  fam.d_num_tel_contato_1_fam,
  COALESCE(rf.p_num_cpf_pessoa, pri.p_num_cpf_pessoa)     AS rf_cpf,
  COALESCE(rf.p_nom_pessoa, pri.p_nom_pessoa)             AS rf_nome,
  COALESCE(rf.p_num_nis_pessoa_atual, pri.p_num_nis_pessoa_atual) AS nis_fam
FROM vw_familias_limpa fam
LEFT JOIN vw_pessoas_limpa rf
  ON rf.p_cod_familiar_fam = fam.d_cod_familiar_fam
 AND rf.p_cod_parentesco_rf_pessoa = 1
LEFT JOIN LATERAL (
  SELECT p_num_cpf_pessoa, p_nom_pessoa, p_num_nis_pessoa_atual
  FROM vw_pessoas_limpa p2
  WHERE p2.p_cod_familiar_fam = fam.d_cod_familiar_fam
  ORDER BY p2.id
  LIMIT 1
) pri ON rf.p_num_cpf_pessoa IS NULL;

CREATE UNIQUE INDEX idx_mv_folha_familias_key ON mv_folha_familias (cod_familiar);
COMMENT ON MATERIALIZED VIEW mv_folha_familias IS 'Familias_limpa + CPF/nome do RF (ou primeira pessoa quando não há RF).';

CREATE VIEW vw_folha_rf AS
SELECT
  fl.ref_folha,
  b.cod_familiar,
  COALESCE(fl.cpf, fam.rf_cpf)       AS cpf,
  COALESCE(fl.nis, fam.nis_fam)               AS nis,
  COALESCE(fl.nome, fam.rf_nome)     AS nome,
  CASE
    WHEN c.motivo IS NOT NULL THEN 'CANCELADO'
    WHEN bl.motivo IS NOT NULL THEN 'BLOQUEADO'
    ELSE UPPER(COALESCE(fl.sitfam, 'LIBERADO'))
  END                                 AS sit_fam,
  bl.motivo                           AS motivo_bloqueio,
  c.motivo                            AS motivo_cancelamento,
  NULLIF(
    TRIM(CONCAT_WS(' ',
      TRIM(fam.d_nom_titulo_logradouro_fam),
      TRIM(fam.d_nom_logradouro_fam),
      TRIM(fam.d_num_logradouro_fam),
      TRIM(fam.d_des_complemento_fam),
      TRIM(fam.d_nom_unidade_territorial_fam),
      TRIM(fam.d_num_cep_logradouro_fam)
    )),
    ''
  )                                   AS endereco_cadu,
  NULLIF(
    TRIM(CONCAT_WS('', TRIM(fam.d_num_ddd_contato_1_fam), TRIM(fam.d_num_tel_contato_1_fam))),
    ''
  )                                   AS telefone_cadu
FROM mv_folha_base b
LEFT JOIN mv_folha_linhas fl
  ON fl.ibge = b.ibge AND fl.cod_familiar = b.cod_familiar
LEFT JOIN mv_folha_familias fam
  ON fam.cod_familiar = b.cod_familiar
LEFT JOIN mv_folha_bloq bl
  ON bl.ibge = b.ibge AND bl.cod_familiar = b.cod_familiar
LEFT JOIN mv_folha_canc c
  ON c.ibge = b.ibge AND c.cod_familiar = b.cod_familiar;

COMMENT ON VIEW vw_folha_rf IS 'View final Folha RF: junta mv_folha_* (materializadas). Após carga: REFRESH MATERIALIZED VIEW nas mv_folha_*.';
`.trim();

export const SQL_FAMILIA_CPF_VISITAS = `
DROP VIEW IF EXISTS vw_filtro_controle CASCADE;
DROP VIEW IF EXISTS vw_cpf_situacao CASCADE;
DROP MATERIALIZED VIEW IF EXISTS mv_cpf_familia_situacao CASCADE;
DROP MATERIALIZED VIEW IF EXISTS mv_familia_situacao CASCADE;

CREATE MATERIALIZED VIEW mv_familia_situacao AS
WITH base AS (
  SELECT NULLIF(TRIM(ibge), '') AS ibge, norm_cod_familiar(cod_familiar) AS cod_familiar
  FROM sibec_folha_pagamento
  WHERE NULLIF(TRIM(ibge), '') IS NOT NULL AND norm_cod_familiar(cod_familiar) IS NOT NULL
  UNION
  SELECT NULLIF(TRIM(ibge), ''), norm_cod_familiar(cod_familiar)
  FROM sibec_bloqueados
  WHERE NULLIF(TRIM(ibge), '') IS NOT NULL AND norm_cod_familiar(cod_familiar) IS NOT NULL
  UNION
  SELECT NULLIF(TRIM(ibge), ''), norm_cod_familiar(cod_familiar)
  FROM sibec_cancelados
  WHERE NULLIF(TRIM(ibge), '') IS NOT NULL AND norm_cod_familiar(cod_familiar) IS NOT NULL
),
bloq AS (
  SELECT ibge, cod_familiar, motivo FROM (
    SELECT NULLIF(TRIM(ibge), '') AS ibge, norm_cod_familiar(cod_familiar) AS cod_familiar, motivo,
           ROW_NUMBER() OVER (PARTITION BY NULLIF(TRIM(ibge), ''), norm_cod_familiar(cod_familiar) ORDER BY dt_hora_acao DESC NULLS LAST) AS rn
    FROM sibec_bloqueados
  ) t WHERE rn = 1
),
canc AS (
  SELECT ibge, cod_familiar, motivo FROM (
    SELECT NULLIF(TRIM(ibge), '') AS ibge, norm_cod_familiar(cod_familiar) AS cod_familiar, motivo,
           ROW_NUMBER() OVER (PARTITION BY NULLIF(TRIM(ibge), ''), norm_cod_familiar(cod_familiar) ORDER BY dt_hora_acao DESC NULLS LAST) AS rn
    FROM sibec_cancelados
  ) t WHERE rn = 1
)
SELECT
  b.ibge,
  b.cod_familiar,
  CASE WHEN c.motivo IS NOT NULL THEN 'CANCELADO' WHEN bl.motivo IS NOT NULL THEN 'BLOQUEADO' ELSE 'LIBERADO' END AS sit_fam,
  bl.motivo AS motivo_bloqueio,
  c.motivo AS motivo_cancelamento
FROM base b
LEFT JOIN bloq bl ON bl.ibge = b.ibge AND bl.cod_familiar = b.cod_familiar
LEFT JOIN canc c ON c.ibge = b.ibge AND c.cod_familiar = b.cod_familiar;

CREATE UNIQUE INDEX idx_mv_familia_situacao_key ON mv_familia_situacao (ibge, cod_familiar);
COMMENT ON MATERIALIZED VIEW mv_familia_situacao IS 'Família (d_): uma linha por (ibge, cod_familiar) com sit_fam e motivos. Sem pessoa.';

CREATE MATERIALIZED VIEW mv_cpf_familia_situacao AS
SELECT cpf_sanit, nis, ibge, cod_familiar, sit_fam, motivo_bloqueio, motivo_cancelamento FROM (
  SELECT
    LPAD(SUBSTRING(REGEXP_REPLACE(TRIM(COALESCE(f.cpf, '')), '[^0-9]', '', 'g') FROM 1 FOR 11), 11, '0') AS cpf_sanit,
    NULLIF(TRIM(f.nis), '') AS nis,
    NULLIF(TRIM(f.ibge), '') AS ibge,
    norm_cod_familiar(f.cod_familiar) AS cod_familiar,
    fs.sit_fam,
    fs.motivo_bloqueio,
    fs.motivo_cancelamento
  FROM sibec_folha_pagamento f
  INNER JOIN mv_familia_situacao fs
    ON fs.ibge = NULLIF(TRIM(f.ibge), '') AND fs.cod_familiar = norm_cod_familiar(f.cod_familiar)
  WHERE NULLIF(TRIM(f.ibge), '') IS NOT NULL AND norm_cod_familiar(f.cod_familiar) IS NOT NULL
    AND NULLIF(REGEXP_REPLACE(TRIM(COALESCE(f.cpf, '')), '[^0-9]', '', 'g'), '') IS NOT NULL
  UNION ALL
  SELECT
    LPAD(SUBSTRING(REGEXP_REPLACE(TRIM(COALESCE(b.cpf, '')), '[^0-9]', '', 'g') FROM 1 FOR 11), 11, '0') AS cpf_sanit,
    NULLIF(TRIM(b.nis), '') AS nis,
    NULLIF(TRIM(b.ibge), '') AS ibge,
    norm_cod_familiar(b.cod_familiar) AS cod_familiar,
    fs.sit_fam,
    fs.motivo_bloqueio,
    fs.motivo_cancelamento
  FROM sibec_bloqueados b
  INNER JOIN mv_familia_situacao fs
    ON fs.ibge = NULLIF(TRIM(b.ibge), '') AND fs.cod_familiar = norm_cod_familiar(b.cod_familiar)
  WHERE NULLIF(TRIM(b.ibge), '') IS NOT NULL AND norm_cod_familiar(b.cod_familiar) IS NOT NULL
    AND NULLIF(REGEXP_REPLACE(TRIM(COALESCE(b.cpf, '')), '[^0-9]', '', 'g'), '') IS NOT NULL
  UNION ALL
  SELECT
    LPAD(SUBSTRING(REGEXP_REPLACE(TRIM(COALESCE(p.p_num_cpf_pessoa, '')), '[^0-9]', '', 'g') FROM 1 FOR 11), 11, '0') AS cpf_sanit,
    NULLIF(TRIM(p.p_num_nis_pessoa_atual), '') AS nis,
    NULLIF(TRIM(c.ibge), '') AS ibge,
    norm_cod_familiar(c.cod_familiar) AS cod_familiar,
    fs.sit_fam,
    fs.motivo_bloqueio,
    fs.motivo_cancelamento
  FROM sibec_cancelados c
  INNER JOIN mv_familia_situacao fs
    ON fs.ibge = NULLIF(TRIM(c.ibge), '') AND fs.cod_familiar = norm_cod_familiar(c.cod_familiar)
  INNER JOIN vw_pessoas_limpa p
    ON p.p_cod_familiar_fam = norm_cod_familiar(c.cod_familiar)
  WHERE NULLIF(TRIM(c.ibge), '') IS NOT NULL AND norm_cod_familiar(c.cod_familiar) IS NOT NULL
    AND NULLIF(REGEXP_REPLACE(TRIM(COALESCE(p.p_num_cpf_pessoa, '')), '[^0-9]', '', 'g'), '') IS NOT NULL
) t;

CREATE INDEX idx_mv_cpf_familia_cpf ON mv_cpf_familia_situacao (cpf_sanit);
COMMENT ON MATERIALIZED VIEW mv_cpf_familia_situacao IS 'Pessoa (p_): CPF por família (Folha + Bloqueados + CADU p/ Cancelados). Para cruzar Visitas por CPF.';

CREATE VIEW vw_cpf_situacao AS
SELECT DISTINCT ON (cpf_sanit)
  cpf_sanit,
  sit_fam,
  motivo_bloqueio,
  motivo_cancelamento
FROM mv_cpf_familia_situacao
ORDER BY cpf_sanit,
  CASE sit_fam WHEN 'CANCELADO' THEN 1 WHEN 'BLOQUEADO' THEN 2 ELSE 3 END,
  motivo_cancelamento DESC NULLS LAST,
  motivo_bloqueio DESC NULLS LAST;

COMMENT ON VIEW vw_cpf_situacao IS 'Uma linha por CPF (sanitizado) com sit_fam e motivos. Para vw_filtro_controle.';

CREATE VIEW vw_filtro_controle AS
SELECT
  v.id,
  v.created_at,
  v.row_number,
  v.carimbo_data_hora,
  v.nome_pessoa,
  v.cpf,
  norm_cpf(v.cpf) AS cpf_sanit,
  v.data_nascimento,
  v.nome_rua,
  v.numero,
  v.bairro,
  v.telefone_contato,
  v.referencia_localizacao,
  v.tipo_atendimento,
  v.local_atendimento,
  v.atendente,
  v.periodos_preferidos_visita,
  v.num_pessoas_familia,
  v.area_dificil_acesso,
  v.visita1_data,
  v.visita1_entrevistadores,
  v.visita1_familia_localizada,
  v.visita1_cadastro_atualizado,
  v.visita1_observacao,
  v.visita2_data,
  v.visita2_entrevistadores,
  v.visita2_familia_localizada,
  v.visita2_cadastro_atualizado,
  v.visita2_observacao,
  v.visita3_data,
  v.visita3_entrevistadores,
  v.visita3_familia_localizada,
  v.visita3_cadastro_atualizado,
  v.visita3_observacao,
  v.ja_teve_visita,
  v.teve_visita1,
  v.teve_visita2,
  v.teve_visita3,
  v.ainda_precisa_visita,
  v.bloqueados,
  v.cancelados,
  v.cancelado_em,
  v.tempo_desde_ultima_atualizacao,
  s.sit_fam AS situacao_familia,
  s.motivo_bloqueio,
  s.motivo_cancelamento
FROM visitas_raw v
LEFT JOIN vw_cpf_situacao s
  ON s.cpf_sanit = norm_cpf(v.cpf)
 AND norm_cpf(v.cpf) IS NOT NULL;

COMMENT ON VIEW vw_filtro_controle IS 'Visitas + situacao_familia e motivos. Cruzamento por CPF sanitizado (norm_cpf). Qualquer CPF da base ~124k (Folha+Bloq+CADU Cancelados) cruza.';
`.trim();
