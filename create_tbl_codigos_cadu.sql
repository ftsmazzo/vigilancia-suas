-- =============================================================================
-- Tabela auxiliar de códigos CADU (descritores para BI e agente de IA)
-- Cruzar com vw_pessoas_limpa e vw_familias_limpa para obter texto em vez de código.
-- Ex.: sexo, escolaridade (grau_instrucao), raça/cor, parentesco (responsável familiar = 1), etc.
-- Fonte: coluna "resposta" do dicionário (campo; descricao; resposta com "cod - Descrição#...").
-- Para atualizar a partir do dicionário: rodar scripts/gerar_tbl_codigos_from_dicionario.js
--       e depois executar insert_tbl_codigos_cadu_generated.sql (ou incluir abaixo).
-- =============================================================================

DROP TABLE IF EXISTS tbl_codigos_cadu CASCADE;

CREATE TABLE tbl_codigos_cadu (
    nome_campo TEXT NOT NULL,
    cod        TEXT NOT NULL,
    descricao  TEXT NOT NULL,
    PRIMARY KEY (nome_campo, cod)
);

COMMENT ON TABLE tbl_codigos_cadu IS 'Descritores dos códigos numéricos do CADU (sexo, raça, grau instrução, parentesco, etc.). Cruzar com vw_pessoas_limpa/vw_familias_limpa.';
COMMENT ON COLUMN tbl_codigos_cadu.nome_campo IS 'Nome da coluna na view (ex.: p_cod_sexo_pessoa, p_cod_raca_cor_pessoa, p_grau_instrucao)';
COMMENT ON COLUMN tbl_codigos_cadu.cod IS 'Valor numérico ou código armazenado na view';
COMMENT ON COLUMN tbl_codigos_cadu.descricao IS 'Texto descritivo do dicionário (ex.: Masculino, Feminino)';

-- Índices para JOIN por campo (agente/BI cruzam por nome_campo + cod)
CREATE INDEX idx_tbl_codigos_cadu_campo ON tbl_codigos_cadu(nome_campo);
CREATE INDEX idx_tbl_codigos_cadu_cod ON tbl_codigos_cadu(nome_campo, cod);

-- Inserir dados: execute em seguida o arquivo gerado pelo script:
--   node scripts/gerar_tbl_codigos_from_dicionario.js  (gera insert_tbl_codigos_cadu_generated.sql)
--   psql -f insert_tbl_codigos_cadu_generated.sql
-- Ou no N8N/psql: executar create_tbl_codigos_cadu.sql e depois insert_tbl_codigos_cadu_generated.sql

-- Exemplo de uso (agente/BI): obter sexo e raça em texto para vw_pessoas_limpa
--   SELECT p.*, s.descricao AS sexo_desc, r.descricao AS raca_desc
--   FROM vw_pessoas_limpa p
--   LEFT JOIN tbl_codigos_cadu s ON s.nome_campo = 'p_cod_sexo_pessoa' AND s.cod = p.p_cod_sexo_pessoa::TEXT
--   LEFT JOIN tbl_codigos_cadu r ON r.nome_campo = 'p_cod_raca_cor_pessoa' AND r.cod = p.p_cod_raca_cor_pessoa::TEXT;
