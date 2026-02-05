-- =============================================================================
-- Match Geo × CADU (Fase 1 da estratégia de sanitização).
-- Cria: norm_logradouro_para_match(t), mv_familias_geo (materialized view).
-- Geo = fonte da verdade (1) — (N) famílias; sempre usar Geo para território.
-- Requer: create_views_cadu.sql, create_mv_familias_limpa.sql (mv_familias_limpa), tbl_geo carregada.
-- Ver: GEO_ESTRATEGIA_SANITIZACAO.md, GUIA_GEO.md.
--
-- Se der TIMEOUT: rode em 2 etapas — create_geo_match_step1.sql (pesado) e
-- create_geo_match_step2.sql (rápido). No PGAdmin: Aumente o timeout da Query Tool
-- (File → Preferences → Query Tool → Query execution timeout = 0 ou 3600).
-- =============================================================================

-- Desliga o timeout desta sessão (só afeta o servidor; se o cliente cortar, não adianta).
SET statement_timeout = '0';

-- Função: normaliza uma linha de endereço para comparação (maiúsculas, sem acento, abreviações padronizadas).
CREATE OR REPLACE FUNCTION norm_logradouro_para_match(t TEXT) RETURNS TEXT AS $$
DECLARE
  s TEXT;
BEGIN
  s := UPPER(TRIM(COALESCE(t, '')));
  IF s = '' THEN RETURN NULL; END IF;
  -- Remove acentos (minúsculas e maiúsculas)
  s := TRANSLATE(s,
    'áàãâäéèêëíìîïóòõôöúùûüçÁÀÃÂÄÉÈÊËÍÌÎÏÓÒÕÔÖÚÙÛÜÇ',
    'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC');
  -- Abreviações comuns (palavra inteira). PRAÇA vira PRACA pelo TRANSLATE acima.
  s := REGEXP_REPLACE(s, '\mR\.?\M', 'RUA', 'gi');
  s := REGEXP_REPLACE(s, '\mAV\.?\M', 'AVENIDA', 'gi');
  s := REGEXP_REPLACE(s, '\mPRA\.?\M', 'PRACA', 'gi');
  s := REGEXP_REPLACE(s, '\mDR\.?\M', 'DOUTOR', 'gi');
  s := REGEXP_REPLACE(s, '\mPROF\.?\M', 'PROFESSOR', 'gi');
  -- Múltiplos espaços
  s := REGEXP_REPLACE(TRIM(s), '\s+', ' ', 'g');
  RETURN NULLIF(s, '');
END;
$$ LANGUAGE PLPGSQL IMMUTABLE;

COMMENT ON FUNCTION norm_logradouro_para_match(TEXT) IS 'Normaliza endereço para match Geo×CADU: maiúsculas, sem acento, abreviações padronizadas.';

-- Materialized view: famílias do CADU que deram match com a Geo (CEP + logradouro normalizado iguais).
-- Lê de mv_familias_limpa (não de vw_familias_limpa) para o refresh ser rápido. Requer create_mv_familias_limpa.sql antes.
-- Geo = 1, famílias = N; sempre usar bairro_geo/cras_geo/lat_geo/long_geo para território.
DROP MATERIALIZED VIEW IF EXISTS mv_familias_geo CASCADE;
DROP VIEW IF EXISTS vw_familias_geo CASCADE;
CREATE MATERIALIZED VIEW mv_familias_geo AS
SELECT
  f.d_cd_ibge,
  f.d_cod_familiar_fam,
  f.d_nis_responsavel_fam,
  f.d_dat_cadastramento_fam,
  f.d_dat_atual_fam,
  f.d_nom_localidade_fam,
  f.d_nom_tip_logradouro_fam,
  f.d_nom_titulo_logradouro_fam,
  f.d_nom_logradouro_fam,
  f.d_num_logradouro_fam,
  f.d_num_cep_logradouro_fam,
  f.d_nom_unidade_territorial_fam,
  g.cep                AS cep_geo,
  g.endereco           AS endereco_geo,
  g.bairro             AS bairro_geo,
  g.cras               AS cras_geo,
  g.creas              AS creas_geo,
  g.lat_num            AS lat_geo,
  g.long_num           AS long_geo,
  'alto'::TEXT         AS confianca_match
FROM mv_familias_limpa f
INNER JOIN tbl_geo g
  ON g.cep_norm = f.d_num_cep_logradouro_fam
  AND f.d_num_cep_logradouro_fam IS NOT NULL
  AND g.cep_norm IS NOT NULL
  AND norm_logradouro_para_match(
        CONCAT_WS(' ',
          NULLIF(TRIM(COALESCE(f.d_nom_tip_logradouro_fam, '')), ''),
          NULLIF(TRIM(COALESCE(f.d_nom_titulo_logradouro_fam, '')), ''),
          NULLIF(TRIM(COALESCE(f.d_nom_logradouro_fam, '')), '')
        )
      ) = norm_logradouro_para_match(g.endereco);

CREATE UNIQUE INDEX idx_mv_familias_geo_fam ON mv_familias_geo (d_cd_ibge, d_cod_familiar_fam);

COMMENT ON MATERIALIZED VIEW mv_familias_geo IS 'Famílias CADU com match na Geo (CEP + logradouro). Só entra quem bate na Geo. Traz cep_geo, endereco_geo, bairro_geo, cras_geo, creas_geo, lat_geo, long_geo. Via CEP/estratégias atualizam tbl_geo; refresh agrega mais famílias.';

-- Índice para match só por logradouro (buscar CEP na Geo pelo endereço do CADU).
CREATE INDEX IF NOT EXISTS idx_tbl_geo_logradouro_match
  ON tbl_geo (norm_logradouro_para_match(endereco))
  WHERE endereco IS NOT NULL;

-- Materialized view: só as famílias "erro" (CEP existe na Geo mas não deu match CEP+logradouro).
-- Fazemos o match por logradouro APENAS nesse conjunto, para reduzir tempo (não na base toda).
DROP MATERIALIZED VIEW IF EXISTS mv_familias_geo_por_logradouro CASCADE;
CREATE MATERIALIZED VIEW mv_familias_geo_por_logradouro AS
WITH candidatos AS (
  SELECT f.d_cd_ibge, f.d_cod_familiar_fam,
    f.d_nom_tip_logradouro_fam, f.d_nom_titulo_logradouro_fam, f.d_nom_logradouro_fam
  FROM mv_familias_limpa f
  WHERE f.d_num_cep_logradouro_fam IS NOT NULL
    AND EXISTS (SELECT 1 FROM tbl_geo g0 WHERE g0.cep_norm = f.d_num_cep_logradouro_fam)
    AND NOT EXISTS (SELECT 1 FROM mv_familias_geo m WHERE m.d_cd_ibge = f.d_cd_ibge AND m.d_cod_familiar_fam = f.d_cod_familiar_fam)
    AND norm_logradouro_para_match(
          CONCAT_WS(' ',
            NULLIF(TRIM(COALESCE(f.d_nom_tip_logradouro_fam, '')), ''),
            NULLIF(TRIM(COALESCE(f.d_nom_titulo_logradouro_fam, '')), ''),
            NULLIF(TRIM(COALESCE(f.d_nom_logradouro_fam, '')), '')
          )
        ) IS NOT NULL
)
SELECT DISTINCT ON (c.d_cd_ibge, c.d_cod_familiar_fam)
  c.d_cd_ibge,
  c.d_cod_familiar_fam,
  g.cep                AS cep_geo,
  g.endereco           AS endereco_geo,
  g.bairro             AS bairro_geo,
  g.cras               AS cras_geo,
  g.creas              AS creas_geo,
  g.lat_num            AS lat_geo,
  g.long_num           AS long_geo
FROM candidatos c
INNER JOIN tbl_geo g
  ON norm_logradouro_para_match(
        CONCAT_WS(' ',
          NULLIF(TRIM(COALESCE(c.d_nom_tip_logradouro_fam, '')), ''),
          NULLIF(TRIM(COALESCE(c.d_nom_titulo_logradouro_fam, '')), ''),
          NULLIF(TRIM(COALESCE(c.d_nom_logradouro_fam, '')), '')
        )
      ) = norm_logradouro_para_match(g.endereco)
  AND g.endereco IS NOT NULL
ORDER BY c.d_cd_ibge, c.d_cod_familiar_fam, g.cep;

CREATE UNIQUE INDEX idx_mv_familias_geo_logradouro_fam ON mv_familias_geo_por_logradouro (d_cd_ibge, d_cod_familiar_fam);

COMMENT ON MATERIALIZED VIEW mv_familias_geo_por_logradouro IS 'Só candidatos (CEP na Geo, sem match CEP+logradouro): match por logradouro. Corrige CEP genérico sem alterar cadastro; execução rápida.';

-- View: TODAS as famílias. Território = primeiro match CEP+logradouro (mv_familias_geo), senão match só por logradouro (mv_familias_geo_por_logradouro).
-- Assim o CEP da Geo passa a valer quando o endereço do CADU coincide, sem Via CEP e sem alterar cadu_raw.
DROP VIEW IF EXISTS vw_familias_territorio CASCADE;
CREATE VIEW vw_familias_territorio AS
SELECT
  f.*,
  COALESCE(g1.cep_geo, g2.cep_geo)             AS cep_territorio,
  COALESCE(g1.endereco_geo, g2.endereco_geo)   AS endereco_territorio,
  COALESCE(g1.bairro_geo, g2.bairro_geo)       AS bairro_territorio,
  COALESCE(g1.cras_geo, g2.cras_geo)           AS cras_territorio,
  COALESCE(g1.creas_geo, g2.creas_geo)        AS creas_territorio,
  COALESCE(g1.lat_geo, g2.lat_geo)             AS lat_territorio,
  COALESCE(g1.long_geo, g2.long_geo)           AS long_territorio
FROM mv_familias_limpa f
LEFT JOIN mv_familias_geo g1 ON g1.d_cd_ibge = f.d_cd_ibge AND g1.d_cod_familiar_fam = f.d_cod_familiar_fam
LEFT JOIN mv_familias_geo_por_logradouro g2 ON g2.d_cd_ibge = f.d_cd_ibge AND g2.d_cod_familiar_fam = f.d_cod_familiar_fam;

COMMENT ON VIEW vw_familias_territorio IS 'Todas as famílias: território da Geo por match CEP+logradouro ou só logradouro (CEP corrigido da Geo). Sem alterar cadastro. Use esta view no sistema.';
