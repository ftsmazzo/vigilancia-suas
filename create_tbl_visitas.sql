-- =============================================================================
-- Tabela de visitas (formulário Google Sheets)
-- Espelho da planilha que recebe dados do formulário de visitas.
-- Fonte: Google Sheets → extração (JSON) → carga nesta tabela (N8N ou similar).
-- Colunas em snake_case; tipos compatíveis com planilha (TEXT para flexibilidade).
-- =============================================================================

DROP TABLE IF EXISTS visitas_raw CASCADE;

CREATE TABLE visitas_raw (
    id                              SERIAL PRIMARY KEY,
    created_at                      TIMESTAMPTZ DEFAULT now(),
    -- Planilha: número da linha (row_number da extração)
    row_number                      INTEGER,
    -- Formulário / cabeçalhos da planilha
    carimbo_data_hora               TEXT,   -- "Carimbo de data/hora"
    nome_pessoa                    TEXT,   -- "Nome da pessoa"
    cpf                            TEXT,   -- CPF (TEXT para preservar zeros à esquerda)
    data_nascimento                 TEXT,   -- Data de Nascimento
    nome_rua                       TEXT,   -- Nome da Rua
    numero                         TEXT,   -- Número (TEXT: pode vir número ou texto da planilha)
    bairro                         TEXT,   -- Bairro
    telefone_contato               TEXT,   -- Telefone para contato
    referencia_localizacao         TEXT,   -- Referência para Localização
    tipo_atendimento               TEXT,   -- Tipo de atendimento
    local_atendimento              TEXT,   -- Local de Atendimento
    atendente                      TEXT,   -- ATENDENTE
    periodos_preferidos_visita     TEXT,   -- Quais períodos a pessoa prefere a visita?
    num_pessoas_familia            TEXT,   -- Número de pessoas na família
    area_dificil_acesso            TEXT,   -- É area de difícil acesso?
    -- 1ª Visita
    visita1_data                   TEXT,   -- 1ª Visita - Data
    visita1_entrevistadores        TEXT,   -- 1ª Visita - Entrevistadores
    visita1_familia_localizada     TEXT,   -- 1ª Visita - Família Localizada?
    visita1_cadastro_atualizado    TEXT,   -- 1ª Visita - Cadastro Atualizado?
    visita1_observacao             TEXT,   -- 1ª Visita - Observação
    -- 2ª Visita
    visita2_data                   TEXT,
    visita2_entrevistadores        TEXT,
    visita2_familia_localizada     TEXT,
    visita2_cadastro_atualizado    TEXT,
    visita2_observacao             TEXT,
    -- 3ª Visita
    visita3_data                   TEXT,
    visita3_entrevistadores        TEXT,
    visita3_familia_localizada     TEXT,
    visita3_cadastro_atualizado    TEXT,
    visita3_observacao             TEXT,
    -- Resumos / status
    ja_teve_visita                 TEXT,   -- Já foi feita alguma visita?
    teve_visita1                   TEXT,   -- Teve 1ª Visita?
    teve_visita2                   TEXT,
    teve_visita3                   TEXT,
    ainda_precisa_visita           TEXT,   -- Ainda precisa de visita?
    bloqueados                     TEXT,
    cancelados                     TEXT,
    cancelado_em                   TEXT,
    tempo_desde_ultima_atualizacao NUMERIC -- Tempo desde a última atualização
);

COMMENT ON TABLE visitas_raw IS 'Dados do formulário de visitas (Google Sheets). Carga via N8N/extração JSON.';
COMMENT ON COLUMN visitas_raw.row_number IS 'Número da linha na planilha no momento da extração';
COMMENT ON COLUMN visitas_raw.created_at IS 'Quando o registro foi inserido no Postgres';

-- Índices úteis para filtros e cruzamentos
CREATE INDEX idx_visitas_raw_cpf ON visitas_raw(cpf);
CREATE INDEX idx_visitas_raw_nome ON visitas_raw(nome_pessoa);
CREATE INDEX idx_visitas_raw_carimbo ON visitas_raw(carimbo_data_hora);
CREATE INDEX idx_visitas_raw_ainda_precisa ON visitas_raw(ainda_precisa_visita) WHERE NULLIF(TRIM(ainda_precisa_visita), '') IS NOT NULL;

-- =============================================================================
-- Mapeamento JSON (Google Sheets / automação) → coluna visitas_raw
-- Use este mapa ao montar o nó que insere na tabela (N8N: Set, Code ou Postgres).
-- =============================================================================
-- row_number                         → row_number
-- "Carimbo de data/hora"             → carimbo_data_hora
-- "\n Nome da pessoa"                → nome_pessoa
-- CPF                                → cpf
-- Data de Nascimento                 → data_nascimento
-- Nome da Rua                        → nome_rua
-- Número                             → numero
-- Bairro                             → bairro
-- Telefone para contato              → telefone_contato
-- Referência para Localização        → referencia_localizacao
-- Tipo de atendimento                → tipo_atendimento
-- Local de Atendimento               → local_atendimento
-- ATENDENTE  (com espaços)           → atendente
-- Quais períodos a pessoa prefere... → periodos_preferidos_visita
-- Número de pessoas na família       → num_pessoas_familia
-- É area de difícil acesso?          → area_dificil_acesso
-- "1ª Visita\nData"                  → visita1_data
-- "1ª Visita\nEntrevistadores"       → visita1_entrevistadores
-- "1ª Visita\nFamília Localizada?"   → visita1_familia_localizada
-- "1ª Visita\nCadastro Atualizado?"  → visita1_cadastro_atualizado
-- "1ª Visita\nObservação"            → visita1_observacao
-- (idem 2ª e 3ª Visita)              → visita2_*, visita3_*
-- Já foi feita alguma visita?       → ja_teve_visita
-- Teve 1ª/2ª/3ª Visita?              → teve_visita1, teve_visita2, teve_visita3
-- Ainda precisa de visita?           → ainda_precisa_visita
-- Bloqueados / Cancelados / Cancelado em → bloqueados, cancelados, cancelado_em
-- Tempo desde a última atualização   → tempo_desde_ultima_atualizacao
