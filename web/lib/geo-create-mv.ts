/**
 * Cria ou recria a materialized view mv_familias_geo (match Geo × CADU).
 * Pode demorar vários minutos. Usado pelo botão na página Geolocalização.
 */

import pool from './db';

let createMvInProgress = false;

const SQL_FUNCTION = `
CREATE OR REPLACE FUNCTION norm_logradouro_para_match(t TEXT) RETURNS TEXT AS $$
DECLARE
  s TEXT;
BEGIN
  s := UPPER(TRIM(COALESCE(t, '')));
  IF s = '' THEN RETURN NULL; END IF;
  s := TRANSLATE(s,
    'áàãâäéèêëíìîïóòõôöúùûüçÁÀÃÂÄÉÈÊËÍÌÎÏÓÒÕÔÖÚÙÛÜÇ',
    'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC');
  s := REGEXP_REPLACE(s, '\\mR\\.?\\M', 'RUA', 'gi');
  s := REGEXP_REPLACE(s, '\\mAV\\.?\\M', 'AVENIDA', 'gi');
  s := REGEXP_REPLACE(s, '\\mPRA\\.?\\M', 'PRACA', 'gi');
  s := REGEXP_REPLACE(s, '\\mDR\\.?\\M', 'DOUTOR', 'gi');
  s := REGEXP_REPLACE(s, '\\mPROF\\.?\\M', 'PROFESSOR', 'gi');
  s := REGEXP_REPLACE(TRIM(s), '\\s+', ' ', 'g');
  RETURN NULLIF(s, '');
END;
$$ LANGUAGE PLPGSQL IMMUTABLE
`.trim();

const SQL_CREATE_MV = `
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
      ) = norm_logradouro_para_match(g.endereco)
`.trim();

const SQL_CREATE_MV_POR_LOGRADOURO = `
CREATE MATERIALIZED VIEW mv_familias_geo_por_logradouro AS
SELECT DISTINCT ON (f.d_cd_ibge, f.d_cod_familiar_fam)
  f.d_cd_ibge,
  f.d_cod_familiar_fam,
  g.cep                AS cep_geo,
  g.endereco           AS endereco_geo,
  g.bairro             AS bairro_geo,
  g.cras               AS cras_geo,
  g.creas              AS creas_geo,
  g.lat_num            AS lat_geo,
  g.long_num           AS long_geo
FROM vw_familias_limpa f
INNER JOIN tbl_geo g
  ON norm_logradouro_para_match(
        CONCAT_WS(' ',
          NULLIF(TRIM(COALESCE(f.d_nom_tip_logradouro_fam, '')), ''),
          NULLIF(TRIM(COALESCE(f.d_nom_titulo_logradouro_fam, '')), ''),
          NULLIF(TRIM(COALESCE(f.d_nom_logradouro_fam, '')), '')
        )
      ) = norm_logradouro_para_match(g.endereco)
  AND g.endereco IS NOT NULL
WHERE NOT EXISTS (
  SELECT 1 FROM mv_familias_geo m
  WHERE m.d_cd_ibge = f.d_cd_ibge AND m.d_cod_familiar_fam = f.d_cod_familiar_fam
)
AND norm_logradouro_para_match(
  CONCAT_WS(' ',
    NULLIF(TRIM(COALESCE(f.d_nom_tip_logradouro_fam, '')), ''),
    NULLIF(TRIM(COALESCE(f.d_nom_titulo_logradouro_fam, '')), ''),
    NULLIF(TRIM(COALESCE(f.d_nom_logradouro_fam, '')), '')
  )
) IS NOT NULL
ORDER BY f.d_cd_ibge, f.d_cod_familiar_fam, g.cep
`.trim();

export async function runCreateGeoMv(): Promise<{ ok: true } | { ok: false; error: string }> {
  if (createMvInProgress) {
    return { ok: false, error: 'Criação já em andamento. Aguarde terminar antes de clicar de novo.' };
  }
  createMvInProgress = true;
  const client = await pool.connect();
  try {
    await client.query("SET statement_timeout = '0'");
    await client.query(SQL_FUNCTION);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_tbl_geo_cep_logradouro_match
        ON tbl_geo (cep_norm, norm_logradouro_para_match(endereco))
        WHERE cep_norm IS NOT NULL
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_tbl_geo_logradouro_match
        ON tbl_geo (norm_logradouro_para_match(endereco))
        WHERE endereco IS NOT NULL
    `);
    await client.query('DROP MATERIALIZED VIEW IF EXISTS mv_familias_geo_por_logradouro CASCADE');
    await client.query('DROP MATERIALIZED VIEW IF EXISTS mv_familias_geo CASCADE');
    await client.query('DROP VIEW IF EXISTS vw_familias_geo CASCADE');
    await client.query(SQL_CREATE_MV);
    await client.query(
      'CREATE UNIQUE INDEX idx_mv_familias_geo_fam ON mv_familias_geo (d_cd_ibge, d_cod_familiar_fam)'
    );
    await client.query(
      "COMMENT ON MATERIALIZED VIEW mv_familias_geo IS 'Famílias CADU com match na Geo (CEP + logradouro). Só entra quem bate na Geo. Traz cep_geo, endereco_geo, bairro_geo, cras_geo, creas_geo, lat_geo, long_geo. Via CEP/estratégias atualizam tbl_geo; refresh agrega mais famílias.'"
    );
    await client.query(SQL_CREATE_MV_POR_LOGRADOURO);
    await client.query(
      'CREATE UNIQUE INDEX idx_mv_familias_geo_logradouro_fam ON mv_familias_geo_por_logradouro (d_cd_ibge, d_cod_familiar_fam)'
    );
    await client.query(
      "COMMENT ON MATERIALIZED VIEW mv_familias_geo_por_logradouro IS 'Famílias CADU que não deram match CEP+logradouro mas o endereço bate na Geo. CEP/território da Geo (corrige CEP genérico sem alterar cadastro).'"
    );
    await client.query('DROP VIEW IF EXISTS vw_familias_territorio CASCADE');
    await client.query(`
      CREATE VIEW vw_familias_territorio AS
      SELECT
        f.*,
        COALESCE(g1.cep_geo, g2.cep_geo) AS cep_territorio,
        COALESCE(g1.endereco_geo, g2.endereco_geo) AS endereco_territorio,
        COALESCE(g1.bairro_geo, g2.bairro_geo) AS bairro_territorio,
        COALESCE(g1.cras_geo, g2.cras_geo) AS cras_territorio,
        COALESCE(g1.creas_geo, g2.creas_geo) AS creas_territorio,
        COALESCE(g1.lat_geo, g2.lat_geo) AS lat_territorio,
        COALESCE(g1.long_geo, g2.long_geo) AS long_territorio
      FROM vw_familias_limpa f
      LEFT JOIN mv_familias_geo g1 ON g1.d_cd_ibge = f.d_cd_ibge AND g1.d_cod_familiar_fam = f.d_cod_familiar_fam
      LEFT JOIN mv_familias_geo_por_logradouro g2 ON g2.d_cd_ibge = f.d_cd_ibge AND g2.d_cod_familiar_fam = f.d_cod_familiar_fam
    `);
    return { ok: true };
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    return { ok: false, error };
  } finally {
    client.release();
    createMvInProgress = false;
  }
}
