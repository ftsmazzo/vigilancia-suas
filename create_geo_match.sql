-- =============================================================================
-- Match Geo × CADU (Fase 1 da estratégia de sanitização).
-- Cria: norm_logradouro_para_match(t), mv_familias_geo (materialized view).
-- Geo = fonte da verdade (1) — (N) famílias; sempre usar Geo para território.
-- Requer: create_views_cadu.sql (norm_cep, vw_familias_limpa), tbl_geo carregada.
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
-- Evita recalcular o join pesado a cada consulta; refresh no painel quando CADU ou Geo for atualizado.
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

CREATE UNIQUE INDEX idx_mv_familias_geo_fam ON mv_familias_geo (d_cd_ibge, d_cod_familiar_fam);

COMMENT ON MATERIALIZED VIEW mv_familias_geo IS 'Famílias CADU com match na Geo (CEP + logradouro). Só entra quem bate na Geo. Traz cep_geo, endereco_geo, bairro_geo, cras_geo, creas_geo, lat_geo, long_geo. Cruzamento: famílias/pessoas por código familiar com mv_familias_geo. Via CEP/estratégias atualizam tbl_geo; refresh agrega mais famílias.';
