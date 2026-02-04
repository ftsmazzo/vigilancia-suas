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
  g.bairro             AS bairro_geo,
  g.cras               AS cras_geo,
  g.creas              AS creas_geo,
  g.lat_num            AS lat_geo,
  g.long_num           AS long_geo,
  g.endereco           AS endereco_geo,
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
    await client.query('DROP MATERIALIZED VIEW IF EXISTS mv_familias_geo CASCADE');
    await client.query('DROP VIEW IF EXISTS vw_familias_geo CASCADE');
    await client.query(SQL_CREATE_MV);
    await client.query(
      'CREATE UNIQUE INDEX idx_mv_familias_geo_fam ON mv_familias_geo (d_cd_ibge, d_cod_familiar_fam)'
    );
    await client.query(
      "COMMENT ON MATERIALIZED VIEW mv_familias_geo IS 'Famílias CADU com match seguro na Geo (CEP + logradouro). Geo = fonte da verdade para território. Refresh no painel após atualizar CADU ou Geo.'"
    );
    return { ok: true };
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    return { ok: false, error };
  } finally {
    client.release();
    createMvInProgress = false;
  }
}
