-- =============================================================================
-- SUBSTITUÍDO por create_view_familia_cpf_visitas.sql (estrutura família/pessoa,
-- CPF de Folha+Bloqueados+CADU para Cancelados). Manter só como referência.
-- =============================================================================
-- View: Filtro Controle - visitas_raw + situação da família (vw_folha_rf)
-- Cruza por CPF: agrega aos dados de visitas_raw a informação sit_fam
-- (BLOQUEADO, LIBERADO, CANCELADO) da view Folha RF.
-- CPF sanitizado nos dois lados: só dígitos + LPAD 11 zeros (ex.: 123.456.789-00 → 12345678900).
-- Nome: vw_filtro_controle
-- =============================================================================

DROP VIEW IF EXISTS vw_filtro_controle CASCADE;

CREATE VIEW vw_filtro_controle AS
WITH
-- Sanitizar CPF da folha: TRIM, só dígitos, até 11 chars, zeros à esquerda (mesma regra nos dois lados)
folha_cpf AS (
  SELECT
    sit_fam,
    LPAD(SUBSTRING(regexp_replace(TRIM(COALESCE(cpf, '')), '[^0-9]', '', 'g') FROM 1 FOR 11), 11, '0') AS cpf_sanit
  FROM vw_folha_rf
  WHERE NULLIF(TRIM(COALESCE(cpf, '')), '') IS NOT NULL
),
folha_por_cpf AS (
  SELECT DISTINCT ON (cpf_sanit) cpf_sanit, sit_fam
  FROM folha_cpf
  ORDER BY cpf_sanit, sit_fam
)
SELECT
  v.id,
  v.created_at,
  v.row_number,
  v.carimbo_data_hora,
  v.nome_pessoa,
  v.cpf,
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
  f.sit_fam AS situacao_familia
FROM visitas_raw v
LEFT JOIN folha_por_cpf f
  ON f.cpf_sanit = LPAD(SUBSTRING(regexp_replace(TRIM(COALESCE(v.cpf, '')), '[^0-9]', '', 'g') FROM 1 FOR 11), 11, '0')
 AND NULLIF(regexp_replace(TRIM(COALESCE(v.cpf, '')), '[^0-9]', '', 'g'), '') IS NOT NULL;

COMMENT ON VIEW vw_filtro_controle IS 'Visitas (visitas_raw) cruzadas com vw_folha_rf por CPF. Coluna situacao_familia: BLOQUEADO, LIBERADO ou CANCELADO.';
