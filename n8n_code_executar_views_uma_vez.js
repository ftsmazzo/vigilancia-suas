// =============================================================================
// N8N Code node: "Executar views uma vez"
// Colar TUDO deste arquivo no nó Code. Saída: 1 item com { sql: "..." }.
// Conexão: entrada = saída de "Inserir lotes"; saída → Postgres "Criar/recriar views".
// =============================================================================

// No Postgres (node-pg), $ é parâmetro; para enviar $$ literal use $$$$
const SQL_VIEWS = `
CREATE OR REPLACE FUNCTION norm_text(t TEXT) RETURNS TEXT AS $$$$
  SELECT NULLIF(TRIM(t), '');
$$$$ LANGUAGE SQL IMMUTABLE;

CREATE OR REPLACE FUNCTION norm_cpf(t TEXT) RETURNS TEXT AS $$$$
  SELECT CASE
    WHEN NULLIF(TRIM(t), '') IS NULL THEN NULL
    ELSE LPAD(LEFT(REGEXP_REPLACE(t, '[^0-9]', '', 'g'), 11), 11, '0')
  END;
$$$$ LANGUAGE SQL IMMUTABLE;

CREATE OR REPLACE FUNCTION norm_nis(t TEXT) RETURNS TEXT AS $$$$
  SELECT CASE
    WHEN NULLIF(TRIM(t), '') IS NULL THEN NULL
    ELSE LPAD(LEFT(REGEXP_REPLACE(t, '[^0-9]', '', 'g'), 11), 11, '0')
  END;
$$$$ LANGUAGE SQL IMMUTABLE;

CREATE OR REPLACE FUNCTION norm_cep(t TEXT) RETURNS TEXT AS $$$$
  SELECT CASE
    WHEN NULLIF(TRIM(t), '') IS NULL THEN NULL
    ELSE LPAD(LEFT(REGEXP_REPLACE(t, '[^0-9]', '', 'g'), 8), 8, '0')
  END;
$$$$ LANGUAGE SQL IMMUTABLE;

CREATE OR REPLACE FUNCTION norm_phone(t TEXT) RETURNS TEXT AS $$$$
  SELECT CASE
    WHEN NULLIF(TRIM(t), '') IS NULL THEN NULL
    ELSE REGEXP_REPLACE(t, '[^0-9]', '', 'g')
  END;
$$$$ LANGUAGE SQL IMMUTABLE;

CREATE OR REPLACE FUNCTION norm_date(t TEXT) RETURNS DATE AS $$$$
  SELECT CASE
    WHEN NULLIF(TRIM(t), '') IS NULL THEN NULL
    WHEN TRIM(t) ~ $re$^\\d{2}/\\d{2}/\\d{4}$re$ THEN TO_DATE(TRIM(t), 'DD/MM/YYYY')
    WHEN TRIM(t) ~ $re$^\\d{8}$re$ THEN TO_DATE(TRIM(t), 'DDMMYYYY')
    WHEN TRIM(t) ~ $re$^\\d{4}-\\d{2}-\\d{2}$re$ THEN TO_DATE(TRIM(t), 'YYYY-MM-DD')
    ELSE NULL
  END;
$$$$ LANGUAGE SQL IMMUTABLE;

CREATE OR REPLACE FUNCTION norm_num(t TEXT) RETURNS NUMERIC AS $$$$
  SELECT CASE
    WHEN NULLIF(TRIM(t), '') IS NULL THEN NULL
    WHEN TRIM(t) ~ $re$^-?[\\d,.]+$re$ THEN REPLACE(REPLACE(TRIM(t), '.', ''), ',', '.')::NUMERIC
    ELSE NULL
  END;
$$$$ LANGUAGE SQL IMMUTABLE;

CREATE OR REPLACE FUNCTION norm_int(t TEXT) RETURNS INTEGER AS $$$$
  SELECT CASE
    WHEN NULLIF(TRIM(t), '') IS NULL THEN NULL
    WHEN TRIM(t) ~ $re$^-?\\d+$re$ THEN TRIM(t)::INTEGER
    ELSE NULL
  END;
$$$$ LANGUAGE SQL IMMUTABLE;

DROP VIEW IF EXISTS vw_pessoas_limpa CASCADE;
DROP VIEW IF EXISTS vw_familias_limpa CASCADE;
DROP VIEW IF EXISTS v_cadu_pessoas CASCADE;
DROP VIEW IF EXISTS v_cadu_familias CASCADE;

CREATE VIEW vw_familias_limpa AS
SELECT DISTINCT ON (r.d_cod_familiar_fam, r.d_cd_ibge)
    norm_text(r.d_cd_ibge) AS d_cd_ibge,
    norm_text(r.d_cod_familiar_fam) AS d_cod_familiar_fam,
    (SELECT norm_nis(r2.p_num_nis_pessoa_atual)
     FROM cadu_raw r2
     WHERE r2.d_cod_familiar_fam = r.d_cod_familiar_fam
       AND r2.d_cd_ibge = r.d_cd_ibge
       AND NULLIF(TRIM(r2.p_cod_parentesco_rf_pessoa), '') = '1'
     LIMIT 1) AS d_nis_responsavel_fam,
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
    norm_text(r.d_nom_entrevistador_fam) AS d_nom_entrevistador_fam,
    norm_cpf(r.d_num_cpf_entrevistador_fam) AS d_num_cpf_entrevistador_fam,
    norm_num(r.d_vlr_renda_media_fam) AS d_vlr_renda_media_fam,
    norm_int(r.d_fx_rfpc) AS d_fx_rfpc,
    norm_num(r.d_vlr_renda_total_fam) AS d_vlr_renda_total_fam,
    norm_int(r.d_marc_pbf) AS d_marc_pbf,
    norm_int(r.d_qtde_meses_desat_cat) AS d_qtde_meses_desat_cat,
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
    norm_int(r.d_qtd_pessoa_inter_0_17_anos_fam) AS d_qtd_pessoa_inter_0_17_anos_fam,
    norm_int(r.d_qtd_pessoa_inter_18_64_anos_fam) AS d_qtd_pessoa_inter_18_64_anos_fam,
    norm_int(r.d_qtd_pessoa_inter_65_anos_fam) AS d_qtd_pessoa_inter_65_anos_fam,
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
    norm_text(r.d_ic_tipo_contato_1_fam) AS d_ic_tipo_contato_1_fam,
    norm_text(r.d_ic_envo_sms_contato_1_fam) AS d_ic_envo_sms_contato_1_fam,
    norm_phone(r.d_num_tel_contato_2_fam) AS d_num_tel_contato_2_fam,
    norm_phone(r.d_num_ddd_contato_2_fam) AS d_num_ddd_contato_2_fam,
    norm_text(r.d_ic_tipo_contato_2_fam) AS d_ic_tipo_contato_2_fam,
    norm_text(r.d_ic_envo_sms_contato_2_fam) AS d_ic_envo_sms_contato_2_fam,
    norm_text(r.d_cod_cta_energ_unid_consum_fam) AS d_cod_cta_energ_unid_consum_fam,
    norm_text(r.d_ind_parc_mds_fam) AS d_ind_parc_mds_fam,
    norm_text(r.d_ref_cad) AS d_ref_cad,
    norm_text(r.d_ref_pbf) AS d_ref_pbf
FROM cadu_raw r
ORDER BY r.d_cod_familiar_fam, r.d_cd_ibge, r.id;

CREATE VIEW vw_pessoas_limpa AS
SELECT
    r.id,
    r.created_at,
    norm_text(r.d_cod_familiar_fam) AS d_cod_familiar_fam,
    norm_text(r.d_cd_ibge) AS d_cd_ibge,
    norm_text(r.p_cod_familiar_fam) AS p_cod_familiar_fam,
    norm_int(r.p_cod_est_cadastral_memb) AS p_cod_est_cadastral_memb,
    norm_int(r.p_ind_trabalho_infantil_pessoa) AS p_ind_trabalho_infantil_pessoa,
    norm_text(r.p_nom_pessoa) AS p_nom_pessoa,
    norm_nis(r.p_num_nis_pessoa_atual) AS p_num_nis_pessoa_atual,
    norm_text(r.p_nom_apelido_pessoa) AS p_nom_apelido_pessoa,
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
    norm_int(r.p_cod_certidao_registrada_pessoa) AS p_cod_certidao_registrada_pessoa,
    norm_text(r.p_fx_idade) AS p_fx_idade,
    norm_int(r.p_marc_pbf) AS p_marc_pbf,
    norm_int(r.p_ind_identidade_genero) AS p_ind_identidade_genero,
    norm_int(r.p_ind_transgenero) AS p_ind_transgenero,
    norm_int(r.p_ind_tipo_identidade_genero) AS p_ind_tipo_identidade_genero,
    norm_int(r.p_cod_certidao_civil_pessoa) AS p_cod_certidao_civil_pessoa,
    norm_text(r.p_cod_livro_termo_certid_pessoa) AS p_cod_livro_termo_certid_pessoa,
    norm_text(r.p_cod_folha_termo_certid_pessoa) AS p_cod_folha_termo_certid_pessoa,
    norm_text(r.p_cod_termo_matricula_certid_pessoa) AS p_cod_termo_matricula_certid_pessoa,
    norm_text(r.p_nom_munic_certid_pessoa) AS p_nom_munic_certid_pessoa,
    norm_text(r.p_cod_ibge_munic_certid_pessoa) AS p_cod_ibge_munic_certid_pessoa,
    norm_text(r.p_cod_cartorio_certid_pessoa) AS p_cod_cartorio_certid_pessoa,
    norm_cpf(r.p_num_cpf_pessoa) AS p_num_cpf_pessoa,
    norm_text(r.p_num_identidade_pessoa) AS p_num_identidade_pessoa,
    norm_text(r.p_cod_complemento_pessoa) AS p_cod_complemento_pessoa,
    norm_date(r.p_dta_emissao_ident_pessoa) AS p_dta_emissao_ident_pessoa,
    norm_text(r.p_sig_uf_ident_pessoa) AS p_sig_uf_ident_pessoa,
    norm_text(r.p_sig_orgao_emissor_pessoa) AS p_sig_orgao_emissor_pessoa,
    norm_text(r.p_num_cart_trab_prev_soc_pessoa) AS p_num_cart_trab_prev_soc_pessoa,
    norm_text(r.p_num_serie_trab_prev_soc_pessoa) AS p_num_serie_trab_prev_soc_pessoa,
    norm_date(r.p_dta_emissao_cart_trab_pessoa) AS p_dta_emissao_cart_trab_pessoa,
    norm_text(r.p_sig_uf_cart_trab_pessoa) AS p_sig_uf_cart_trab_pessoa,
    norm_text(r.p_num_titulo_eleitor_pessoa) AS p_num_titulo_eleitor_pessoa,
    norm_text(r.p_num_zona_tit_eleitor_pessoa) AS p_num_zona_tit_eleitor_pessoa,
    norm_text(r.p_num_secao_tit_eleitor_pessoa) AS p_num_secao_tit_eleitor_pessoa,
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
    norm_text(r.p_nom_escola_memb) AS p_nom_escola_memb,
    norm_int(r.p_cod_escola_local_memb) AS p_cod_escola_local_memb,
    norm_text(r.p_sig_uf_escola_memb) AS p_sig_uf_escola_memb,
    norm_text(r.p_nom_munic_escola_memb) AS p_nom_munic_escola_memb,
    norm_text(r.p_cod_ibge_munic_escola_memb) AS p_cod_ibge_munic_escola_memb,
    norm_text(r.p_cod_censo_inep_memb) AS p_cod_censo_inep_memb,
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
    norm_int(r.p_ind_atend_nenhum_memb) AS p_ind_atend_nenhum_memb,
    norm_text(r.p_ref_cad) AS p_ref_cad,
    norm_text(r.p_ref_pbf) AS p_ref_pbf
FROM cadu_raw r;

COMMENT ON VIEW vw_familias_limpa IS 'Uma linha por família (CADU). Inclui d_nis_responsavel_fam (NIS do RF, cod_parentesco_rf=1). Colunas d_* normalizadas. Recriar a cada upload.';
COMMENT ON VIEW vw_pessoas_limpa IS 'Uma linha por pessoa (CADU). Colunas p_* + chave família normalizadas. Cruzar com tbl_codigos_cadu para descritivos. Recriar a cada upload.';
`;

return [{ json: { sql: SQL_VIEWS.trim() } }];
