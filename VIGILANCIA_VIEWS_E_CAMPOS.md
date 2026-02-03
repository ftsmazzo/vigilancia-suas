# Views e tabelas auxiliares – Vigilância CADU

## Referência familiar (responsável pelo cadastro)

No dicionário, o campo **p.cod_parentesco_rf_pessoa** ("Relação de parentesco com o responsável familiar") tem o valor **1** = **"Pessoa Responsável pela Unidade Familiar - RF"**. Essa é a pessoa de referência da família (responsável pelo cadastro).

- Na view **vw_familias_limpa** (uma linha por família), foi incluída a coluna **d_nis_responsavel_fam**: é o **NIS da pessoa que é RF** (ou seja, da linha em que `p_cod_parentesco_rf_pessoa = 1` naquela família). Assim, em cada linha de família você tem o NIS do responsável familiar.
- Em **vw_pessoas_limpa**, o campo **p_cod_parentesco_rf_pessoa** continua disponível; valor **1** = responsável familiar.

## Nomes das views (agente de IA)

Para facilitar o uso pelo agente e pelo BI, as views foram nomeadas:

- **vw_familias_limpa** – uma linha por família (d_* + d_nis_responsavel_fam), com TRIM, CAST e normalização.
- **vw_pessoas_limpa** – uma linha por pessoa (p_* + chave de família), com TRIM, CAST e normalização.

## Novos ou alterados campos no CSV

- A **tabela** `cadu_raw` é montada pelo N8N a partir do **cabeçalho do CSV**, então **novas colunas entram automaticamente** na tabela.
- As **views** são definidas em **create_views_cadu.sql** (SQL fixo). **Novos campos do CSV ficam fora das views** até que você:
  1. Atualize **create_views_cadu.sql** (inclua a nova coluna na view com a normalização adequada).
  2. Execute de novo o passo "Criar/recriar views" no workflow (ou rode o script manualmente).
- A **tabela de códigos** **tbl_codigos_cadu** vem do dicionário. Se houver novo dicionário com outros códigos ou campos:
  1. Atualize o CSV do dicionário (ex.: `Dezembro/dicionariotudo.csv`).
  2. Rode: `node scripts/gerar_tbl_codigos_from_dicionario.js`
  3. Execute: `insert_tbl_codigos_cadu_generated.sql` (ou inclua no fluxo do N8N).

## Tabela auxiliar de descritores (tbl_codigos_cadu)

Serve para **cruzar códigos numéricos com os textos do dicionário** (sexo, escolaridade, raça/cor, parentesco, etc.).

- **Estrutura:** `nome_campo` (ex.: p_cod_sexo_pessoa, p_grau_instrucao), `cod` (valor armazenado), `descricao` (texto do dicionário).
- **Criação:** executar **create_tbl_codigos_cadu.sql** (CREATE TABLE) e depois **insert_tbl_codigos_cadu_generated.sql** (INSERTs gerados a partir do dicionário).
- **Exemplo de uso (agente/BI):** obter sexo e raça em texto para pessoas:

```sql
SELECT p.id, p.p_nom_pessoa, p.p_cod_sexo_pessoa, s.descricao AS sexo_desc,
       p.p_cod_raca_cor_pessoa, r.descricao AS raca_desc,
       p.p_grau_instrucao, g.descricao AS grau_instrucao_desc
FROM vw_pessoas_limpa p
LEFT JOIN tbl_codigos_cadu s ON s.nome_campo = 'p_cod_sexo_pessoa' AND s.cod = p.p_cod_sexo_pessoa::TEXT
LEFT JOIN tbl_codigos_cadu r ON r.nome_campo = 'p_cod_raca_cor_pessoa' AND r.cod = p.p_cod_raca_cor_pessoa::TEXT
LEFT JOIN tbl_codigos_cadu g ON g.nome_campo = 'p_grau_instrucao' AND g.cod = p.p_grau_instrucao::TEXT;
```

Campos com descritores no dicionário (exemplos): sexo (p_cod_sexo_pessoa), raça/cor (p_cod_raca_cor_pessoa), parentesco (p_cod_parentesco_rf_pessoa), grau de instrução (p_grau_instrucao), estado cadastral, PBF, tipo de domicílio, etc. A lista completa está no dicionário (coluna "resposta").
