-- =============================================================================
-- View: Grupos populacionais – família + instruções do dicionário para responder
-- Base: vw_familias_limpa + tbl_codigos_cadu (descricao por código).
-- Campos: indígena, quilombola, faixa RFPC, Grupos Tradicionais e Específicos (MDS),
-- com colunas _desc vindas do dicionário para uso em BI e agente de IA.
-- Depende: create_views_cadu.sql e insert_tbl_codigos_cadu_generated.sql (tbl_codigos_cadu).
-- =============================================================================

DROP VIEW IF EXISTS vw_grupos_populacionais CASCADE;

CREATE VIEW vw_grupos_populacionais AS
SELECT
  f.d_cd_ibge,
  f.d_cod_familiar_fam,
  -- Faixa RFPC (renda per capita)
  f.d_fx_rfpc,
  c_fx.descricao AS d_fx_rfpc_desc,
  -- Família indígena
  f.d_cod_familia_indigena_fam,
  c_ind.descricao AS d_cod_familia_indigena_fam_desc,
  f.d_cod_povo_indigena_fam,
  f.d_nom_povo_indigena_fam,
  f.d_cod_indigena_reside_fam,
  c_reside.descricao AS d_cod_indigena_reside_fam_desc,
  f.d_cod_reserva_indigena_fam,
  f.d_nom_reserva_indigena_fam,
  -- Família quilombola
  f.d_ind_familia_quilombola_fam,
  c_quil.descricao AS d_ind_familia_quilombola_fam_desc,
  f.d_cod_comunidade_quilombola_fam,
  f.d_nom_comunidade_quilombola_fam,
  -- Grupos Populacionais Tradicionais e Específicos (MDS) – código(s) e descrições
  f.d_ind_parc_mds_fam,
  c_parc.descricao AS d_ind_parc_mds_fam_desc,
  ( SELECT string_agg(c2.descricao, ' | ' ORDER BY ord)
    FROM unnest(
      CASE WHEN NULLIF(TRIM(f.d_ind_parc_mds_fam), '') IS NULL THEN ARRAY[]::TEXT[]
           ELSE string_to_array(TRIM(f.d_ind_parc_mds_fam), '#')
      END
    ) WITH ORDINALITY AS u(cod, ord)
    LEFT JOIN tbl_codigos_cadu c2
      ON c2.nome_campo = 'd_ind_parc_mds_fam' AND c2.cod = TRIM(u.cod)
  ) AS grupos_tradicionais_desc
FROM vw_familias_limpa f
LEFT JOIN tbl_codigos_cadu c_fx
  ON c_fx.nome_campo = 'd_fx_rfpc' AND c_fx.cod = f.d_fx_rfpc::TEXT
LEFT JOIN tbl_codigos_cadu c_ind
  ON c_ind.nome_campo = 'd_cod_familia_indigena_fam' AND c_ind.cod = f.d_cod_familia_indigena_fam::TEXT
LEFT JOIN tbl_codigos_cadu c_reside
  ON c_reside.nome_campo = 'd_cod_indigena_reside_fam' AND c_reside.cod = f.d_cod_indigena_reside_fam::TEXT
LEFT JOIN tbl_codigos_cadu c_quil
  ON c_quil.nome_campo = 'd_ind_familia_quilombola_fam' AND c_quil.cod = f.d_ind_familia_quilombola_fam
LEFT JOIN tbl_codigos_cadu c_parc
  ON c_parc.nome_campo = 'd_ind_parc_mds_fam'
 AND c_parc.cod = TRIM((string_to_array(NULLIF(TRIM(f.d_ind_parc_mds_fam), ''), '#'))[1]);

COMMENT ON VIEW vw_grupos_populacionais IS 'Famílias com grupos populacionais (indígena, quilombola, faixa RFPC, grupos tradicionais MDS) e descrições do dicionário para responder.';


-- =============================================================================
-- View: Grupos populacionais por pessoa (raça/cor, faixa etária) + dicionário
-- Uma linha por pessoa; cruza códigos com tbl_codigos_cadu para texto.
-- =============================================================================

DROP VIEW IF EXISTS vw_grupos_populacionais_pessoa CASCADE;

CREATE VIEW vw_grupos_populacionais_pessoa AS
SELECT
  p.id,
  p.d_cd_ibge,
  p.d_cod_familiar_fam,
  p.p_nom_pessoa,
  p.p_num_nis_pessoa_atual,
  p.p_cod_parentesco_rf_pessoa,
  c_parent.descricao AS p_cod_parentesco_rf_pessoa_desc,
  -- Raça/cor (grupo populacional por autodeclaração)
  p.p_cod_raca_cor_pessoa,
  c_raca.descricao AS p_cod_raca_cor_pessoa_desc,
  -- Faixa etária
  p.p_fx_idade,
  c_idade.descricao AS p_fx_idade_desc,
  -- Trabalho infantil
  p.p_ind_trabalho_infantil_pessoa,
  c_ti.descricao AS p_ind_trabalho_infantil_pessoa_desc,
  -- Identidade de gênero (se existir no dicionário)
  p.p_ind_identidade_genero,
  p.p_ind_transgenero,
  p.p_ind_tipo_identidade_genero
FROM vw_pessoas_limpa p
LEFT JOIN tbl_codigos_cadu c_parent
  ON c_parent.nome_campo = 'p_cod_parentesco_rf_pessoa' AND c_parent.cod = p.p_cod_parentesco_rf_pessoa::TEXT
LEFT JOIN tbl_codigos_cadu c_raca
  ON c_raca.nome_campo = 'p_cod_raca_cor_pessoa' AND c_raca.cod = p.p_cod_raca_cor_pessoa::TEXT
LEFT JOIN tbl_codigos_cadu c_idade
  ON c_idade.nome_campo = 'p_fx_idade' AND c_idade.cod = p.p_fx_idade
LEFT JOIN tbl_codigos_cadu c_ti
  ON c_ti.nome_campo = 'p_ind_trabalho_infantil_pessoa' AND c_ti.cod = p.p_ind_trabalho_infantil_pessoa::TEXT;

COMMENT ON VIEW vw_grupos_populacionais_pessoa IS 'Pessoas com raça/cor, faixa etária e demais códigos de grupo populacional + descrições do dicionário para responder.';


-- =============================================================================
-- View: Contagem agrupada por grupo (usa as views acima)
-- Uma linha por (tipo_grupo, grupo) com total. Para BI e relatórios.
-- =============================================================================

DROP VIEW IF EXISTS vw_contagem_por_grupo CASCADE;

CREATE VIEW vw_contagem_por_grupo AS
-- Contagem por Família indígena (Sim/Não)
SELECT
  'Família indígena'::TEXT AS tipo_grupo,
  COALESCE(g.d_cod_familia_indigena_fam_desc, 'Não informado') AS grupo,
  COUNT(*)::BIGINT AS total
FROM vw_grupos_populacionais g
GROUP BY 1, 2

UNION ALL

-- Contagem por Família quilombola (Sim/Não)
SELECT
  'Família quilombola'::TEXT,
  COALESCE(g.d_ind_familia_quilombola_fam_desc, 'Não informado'),
  COUNT(*)::BIGINT
FROM vw_grupos_populacionais g
GROUP BY 1, 2

UNION ALL

-- Contagem por Faixa RFPC (renda per capita)
SELECT
  'Faixa RFPC'::TEXT,
  COALESCE(g.d_fx_rfpc_desc, 'Não informado'),
  COUNT(*)::BIGINT
FROM vw_grupos_populacionais g
GROUP BY 1, 2

UNION ALL

-- Contagem por Grupo tradicional MDS (uma família pode entrar em mais de um grupo)
SELECT
  'Grupo tradicional MDS'::TEXT,
  COALESCE(c.descricao, 'Não informado'),
  COUNT(DISTINCT (g.d_cd_ibge, g.d_cod_familiar_fam))::BIGINT
FROM vw_grupos_populacionais g
CROSS JOIN LATERAL unnest(
  CASE WHEN NULLIF(TRIM(g.d_ind_parc_mds_fam), '') IS NULL OR TRIM(g.d_ind_parc_mds_fam) = '' THEN ARRAY['0']::TEXT[]
       ELSE string_to_array(TRIM(g.d_ind_parc_mds_fam), '#')
  END
) AS u(cod)
LEFT JOIN tbl_codigos_cadu c
  ON c.nome_campo = 'd_ind_parc_mds_fam' AND c.cod = TRIM(u.cod)
GROUP BY 1, 2

UNION ALL

-- Contagem por Raça/cor (pessoas; uma pessoa = uma linha)
SELECT
  'Raça/cor (pessoas)'::TEXT,
  COALESCE(p.p_cod_raca_cor_pessoa_desc, 'Não informado'),
  COUNT(*)::BIGINT
FROM vw_grupos_populacionais_pessoa p
GROUP BY 1, 2

UNION ALL

-- Contagem por Faixa etária (pessoas)
SELECT
  'Faixa etária (pessoas)'::TEXT,
  COALESCE(p.p_fx_idade_desc, 'Não informado'),
  COUNT(*)::BIGINT
FROM vw_grupos_populacionais_pessoa p
GROUP BY 1, 2;

COMMENT ON VIEW vw_contagem_por_grupo IS 'Contagem agrupada por grupo populacional (indígena, quilombola, faixa RFPC, grupos tradicionais MDS, raça/cor, faixa etária). Usa vw_grupos_populacionais e vw_grupos_populacionais_pessoa.';


-- =============================================================================
-- SELECT único: total de pessoas em famílias quilombolas e indígenas (sem view)
-- Pessoas contadas pela família: quilombola = família com d_ind_familia_quilombola_fam = 1 (Sim);
-- indígena = família com d_cod_familia_indigena_fam = 1 (Sim).
-- =============================================================================
SELECT
  (SELECT COUNT(*) FROM vw_pessoas_limpa p
   INNER JOIN vw_familias_limpa f ON f.d_cd_ibge = p.d_cd_ibge AND f.d_cod_familiar_fam = p.d_cod_familiar_fam
   WHERE f.d_ind_familia_quilombola_fam = '1') AS total_pessoas_quilombolas,
  (SELECT COUNT(*) FROM vw_pessoas_limpa p
   INNER JOIN vw_familias_limpa f ON f.d_cd_ibge = p.d_cd_ibge AND f.d_cod_familiar_fam = p.d_cod_familiar_fam
   WHERE f.d_cod_familia_indigena_fam = 1) AS total_pessoas_indigenas;
