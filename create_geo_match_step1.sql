-- =============================================================================
-- ETAPA 1 – Match Geo × CADU (parte pesada).
-- Rode este script primeiro. Pode levar vários minutos (5–30+). Não cancele.
-- Depois que terminar, rode create_geo_match_step2.sql (índice + comentário).
--
-- Se der "canceling statement due to user request": o PGAdmin está cancelando
-- (timeout do cliente). Rode este script pelo TERMINAL com psql (ver GUIA_GEO.md).
-- =============================================================================

SET statement_timeout = '0';

-- Função: normaliza uma linha de endereço para comparação (maiúsculas, sem acento, abreviações padronizadas).
CREATE OR REPLACE FUNCTION norm_logradouro_para_match(t TEXT) RETURNS TEXT AS $$
DECLARE
  s TEXT;
BEGIN
  s := UPPER(TRIM(COALESCE(t, '')));
  IF s = '' THEN RETURN NULL; END IF;
  s := TRANSLATE(s,
    'áàãâäéèêëíìîïóòõôöúùûüçÁÀÃÂÄÉÈÊËÍÌÎÏÓÒÕÔÖÚÙÛÜÇ',
    'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC');
  s := REGEXP_REPLACE(s, '\mR\.?\M', 'RUA', 'gi');
  s := REGEXP_REPLACE(s, '\mAV\.?\M', 'AVENIDA', 'gi');
  s := REGEXP_REPLACE(s, '\mPRA\.?\M', 'PRACA', 'gi');
  s := REGEXP_REPLACE(s, '\mDR\.?\M', 'DOUTOR', 'gi');
  s := REGEXP_REPLACE(s, '\mPROF\.?\M', 'PROFESSOR', 'gi');
  s := REGEXP_REPLACE(TRIM(s), '\s+', ' ', 'g');
  RETURN NULLIF(s, '');
END;
$$ LANGUAGE PLPGSQL IMMUTABLE;

-- Índice para acelerar o join (CEP + logradouro normalizado na Geo).
CREATE INDEX IF NOT EXISTS idx_tbl_geo_cep_logradouro_match
  ON tbl_geo (cep_norm, norm_logradouro_para_match(endereco))
  WHERE cep_norm IS NOT NULL;

DROP MATERIALIZED VIEW IF EXISTS mv_familias_geo CASCADE;
DROP VIEW IF EXISTS vw_familias_geo CASCADE;

-- Esta parte é a que demora (join completo). Aguarde até concluir.
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
FROM vw_familias_limpa f
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
