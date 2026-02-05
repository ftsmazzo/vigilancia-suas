-- =============================================================================
-- Análise: confronto CEP × logradouro (Geo vs CADU) só para cadastros atualizados
-- nos últimos 24 meses. Objetivo: medir quantos têm CEP que existe na Geo mas
-- endereço divergente (ex.: CEP genérico).
-- Requer: create_geo_match.sql (norm_logradouro_para_match), vw_familias_limpa, tbl_geo.
-- =============================================================================

-- Base: famílias com data de atualização nos últimos 24 meses
WITH fam_24m AS (
  SELECT
    f.d_cod_familiar_fam,
    f.d_num_cep_logradouro_fam,
    norm_logradouro_para_match(CONCAT_WS(' ',
      NULLIF(TRIM(COALESCE(f.d_nom_tip_logradouro_fam, '')), ''),
      NULLIF(TRIM(COALESCE(f.d_nom_titulo_logradouro_fam, '')), ''),
      NULLIF(TRIM(COALESCE(f.d_nom_logradouro_fam, '')), '')
    )) AS logradouro_cadu_norm
  FROM vw_familias_limpa f
  WHERE f.d_dat_atual_fam IS NOT NULL
    AND (CURRENT_DATE - f.d_dat_atual_fam)::INTEGER <= 730
),
fam_com_cep AS (
  SELECT * FROM fam_24m
  WHERE d_num_cep_logradouro_fam IS NOT NULL
),
-- Join só por CEP com a Geo; para cada família, ver se algum endereço da Geo coincide
match_por_cep AS (
  SELECT
    f.d_cod_familiar_fam,
    MAX(CASE
      WHEN f.logradouro_cadu_norm = norm_logradouro_para_match(g.endereco)
      THEN 1 ELSE 0
    END) AS endereco_coincide
  FROM fam_com_cep f
  INNER JOIN tbl_geo g
    ON g.cep_norm = f.d_num_cep_logradouro_fam
    AND g.cep_norm IS NOT NULL
  GROUP BY f.d_cod_familiar_fam
)
SELECT
  (SELECT COUNT(*) FROM fam_24m) AS total_familias_24m,
  (SELECT COUNT(*) FROM fam_com_cep) AS com_cep_preenchido_24m,
  (SELECT COUNT(*) FROM match_por_cep) AS cep_existe_na_geo_24m,
  (SELECT COUNT(*) FROM match_por_cep WHERE endereco_coincide = 1) AS endereco_coincide_24m,
  (SELECT COUNT(*) FROM match_por_cep WHERE endereco_coincide = 0) AS endereco_divergente_24m;

-- Legenda:
-- total_familias_24m ................. Total de famílias com data de atualização até 24 meses
-- com_cep_preenchido_24m ............ Dessas, quantas têm CEP preenchido
-- cep_existe_na_geo_24m ............. Dessas, quantas têm CEP que existe na tbl_geo (join só por CEP)
-- endereco_coincide_24m ............. Dessas, quantas têm logradouro CADU = logradouro Geo (OK)
-- endereco_divergente_24m ........... Dessas, quantas têm logradouro diferente (erro / CEP genérico)
