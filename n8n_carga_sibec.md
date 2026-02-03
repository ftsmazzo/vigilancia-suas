# Carga SIBEC – 3 tabelas no Postgres

## Sugestão: **novo workflow** "Carga SIBEC"

- **Por quê:** As 3 tabelas SIBEC vêm de CSVs (ou planilhas) e de um processo diferente do CADU e das Entrevistas. Um workflow só para SIBEC deixa o fluxo claro e você agenda ou dispara quando for atualizar.
- **Fluxo:** Trigger (agendado ou manual) → carregar os 3 CSVs → para cada um: montar SQL (TRUNCATE + INSERT) → Postgres Execute Query.

---

## Ordem no banco (uma vez)

1. Criar as 3 tabelas (se ainda não existirem):
   - `create_tbl_sibec_bloqueados.sql`
   - `create_tbl_sibec_cancelados.sql`
   - `create_tbl_sibec_folha_pagamento.sql`
2. Depois da carga, criar/atualizar a view:
   - `create_view_folha_rf.sql`

---

## Opção A: CSVs no servidor (pasta acessível pelo N8N)

1. **Trigger** (Schedule ou Manual).
2. **Read Binary File** (3 vezes, um por CSV) – ou **Loop** sobre os 3 caminhos.
3. **Code** – recebe o binário do CSV, converte em texto, parse (cabeçalho + linhas), monta `TRUNCATE tabela; INSERT INTO tabela (...) VALUES (...), ...` e devolve `{ sql, rows }`.
4. **Postgres – Execute Query** – query = `{{ $json.sql }}`.

Use os scripts em `n8n_code_sibec_*.js`: cada um espera o **conteúdo do CSV** (string ou binário) e o **nome da tabela** (ou use um nó Code por tabela com o nome fixo).

---

## Opção B: Um nó Code por tabela (recomendado)

Para cada uma das 3 tabelas:

1. **Read Binary File** (ou **Google Drive – Download**) do CSV correspondente.
2. **Code** – colar o script correspondente:
   - `n8n_code_sibec_bloqueados.js` → gera SQL para `sibec_bloqueados`
   - `n8n_code_sibec_cancelados.js` → gera SQL para `sibec_cancelados`
   - `n8n_code_sibec_folha.js` → gera SQL para `sibec_folha_pagamento`
3. **Postgres – Execute Query** – `{{ $json.sql }}`.

Assim você pode rodar as 3 cargas em paralelo (3 ramos) ou em sequência (3 blocos seguidos).

---

## View de consulta: `vw_folha_rf`

- **O que é:** Folha de Pagamento SIBEC **só de Referência Familiar (RF)**, cruzada com famílias (CADU), com endereço e telefone do CADU e com motivos de bloqueio/cancelamento quando existirem.
- **Colunas:** REF_FOLHA, COD_FAMILIAR, CPF, NIS, NOME, TIPO_PGTO_PREVISTO, TP_BENEF, VLRBENEF, VLRTOTAL, SITFAM, motivo_bloqueio, motivo_cancelamento, endereco_cadu, telefone_cadu.
- **Nome:** `vw_folha_rf` (pode renomear depois no `create_view_folha_rf.sql`).
- **Quando criar:** Depois de carregar as 3 tabelas SIBEC e de ter `vw_familias_limpa` (cadu_raw + views CADU) disponível. Rodar `create_view_folha_rf.sql` uma vez; repetir só se alterar a definição da view.
