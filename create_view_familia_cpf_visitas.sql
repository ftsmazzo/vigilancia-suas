-- =============================================================================
-- Estrutura Família (d_) + CPF→Situação para Visitas
-- Família: chave = ibge + cod_familiar (sem pessoa). Pessoa: chave = CPF (e NIS).
-- Visitas cruza por CPF; Cancelados não tem CPF → CPF vem do CADU (vw_pessoas_limpa).
-- Depende: norm_cpf(), norm_cod_familiar() e vw_pessoas_limpa (rodar create_views_cadu.sql antes).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Drops
-- -----------------------------------------------------------------------------
DROP VIEW IF EXISTS vw_filtro_controle CASCADE;
DROP VIEW IF EXISTS vw_cpf_situacao CASCADE;
DROP MATERIALIZED VIEW IF EXISTS mv_cpf_familia_situacao CASCADE;
DROP MATERIALIZED VIEW IF EXISTS mv_familia_situacao CASCADE;

-- -----------------------------------------------------------------------------
-- 1. Família (d_): situação por cod_familiar (sem dados de pessoa)
-- cod_familiar sanitizado: norm_cod_familiar (remove zeros à esquerda).
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- 2. CPF por família (p_): Folha + Bloqueados + CADU (para Cancelados)
-- Uma linha por (cpf_sanit, ibge, cod_familiar) para cruzar com Visitas.
-- -----------------------------------------------------------------------------
CREATE MATERIALIZED VIEW mv_cpf_familia_situacao AS
SELECT cpf_sanit, nis, ibge, cod_familiar, sit_fam, motivo_bloqueio, motivo_cancelamento FROM (
  -- CPFs da Folha + situação da família
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
  -- CPFs de Bloqueados + motivo da família
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
  -- Cancelados: só tem cod_familiar → CPF do CADU (vw_pessoas_limpa)
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

-- -----------------------------------------------------------------------------
-- 3. Uma linha por CPF com situação (para join com Visitas)
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- 4. Visitas + situação da família (cruzamento por CPF)
-- CPF de visitas_raw é sanitizado com norm_cpf() (igual ao CADU) para bater
-- com vw_cpf_situacao. Cruza com qualquer CPF da base (~124k: Folha + Bloqueados
-- + todos os membros CADU das famílias Canceladas), não só RF.
-- -----------------------------------------------------------------------------
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
