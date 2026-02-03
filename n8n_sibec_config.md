# Configuração dos 3 workflows SIBEC (BLOQUEADOS, CANCELADOS, FOLHA PAGAMENTO)

Os 3 workflows estão **clonados do CADU** e ainda usam lógica do CADU. Ajustes necessários:

1. **CSV SIBEC usa vírgula (`,`)** — CADU usa ponto e vírgula (`;`).
2. **Tabela e colunas fixas** — cada workflow grava em uma tabela específica com colunas em snake_case (não dinâmico como no CADU).
3. **Form** — trocar título e descrição para o workflow correto.
4. **Binary na saída do Code** — no n8n (binaryDataMode: filesystem) quem **repassa** binary deve usar `this.helpers.prepareBinaryData(buffer, fileName)` na saída; não usar `binary: { data: buffer }` direto (causa loop/trava). Nós que repassam: **Extração Cabeçalho** e **Montar o SQL**.

---

## Em todos os 3 workflows

### 1. Nó "Cadastro Único" (Form Trigger)

Só mudar **título** e **descrição** do formulário:

| Workflow | formTitle | formDescription |
|----------|-----------|------------------|
| **Extração BLOQUEADOS** | Extração SIBEC Bloqueados | Envie o CSV SIBEC-BLOQUEADOS (delimitador: vírgula). |
| **Extração CANCELADOS** | Extração SIBEC Cancelados | Envie o CSV SIBEC-CANCELADOS (delimitador: vírgula). |
| **Extração FOLHA PAGAMENTO** | Extração SIBEC Folha de Pagamento | Envie o CSV SIBEC-FOLHA_PAGAMENTO (delimitador: vírgula). |

Deixe o campo **"Insira o CSV"** (tipo file) como está.

---

### 2. Nó "Extração Cabeçalho" (Code)

**Use o mesmo código nos 3 workflows.** Ele lê o **primeiro cabeçalho do CSV com vírgula** e repassa o binário.

- **Arquivo:** `n8n_code_sibec_extracao_cabecalho.js` — copie todo o conteúdo e cole no nó "Extração Cabeçalho".

---

## Por workflow: "Montar o SQL" e "Carregar Dados"

Cada workflow tem **Montar o SQL** e **Carregar Dados** diferentes (tabela e colunas fixas). Copie o conteúdo do arquivo e cole no nó correspondente.

| Workflow | Nó "Montar o SQL" | Nó "Carregar Dados" |
|----------|-------------------|----------------------|
| **Extração BLOQUEADOS** | `n8n_code_sibec_montar_sql_bloqueados.js` | `n8n_code_sibec_carregar_dados_bloqueados.js` |
| **Extração CANCELADOS** | `n8n_code_sibec_montar_sql_cancelados.js` | `n8n_code_sibec_carregar_dados_cancelados.js` |
| **Extração FOLHA PAGAMENTO** | `n8n_code_sibec_montar_sql_folha.js` | `n8n_code_sibec_carregar_dados_folha.js` |

---

## Conexões (iguais nos 3)

- **Cadastro Único** → **Extração Cabeçalho**
- **Extração Cabeçalho** → **Montar o SQL**
- **Montar o SQL** → **Criar Tabela** (uma seta)
- **Montar o SQL** → **Carregar Dados** (outra seta, do mesmo nó "Montar o SQL")
- **Carregar Dados** → **Inserir lotes**

**Importante:** O nó **"Carregar Dados"** deve ter **apenas uma** conexão de entrada: a que vem de **"Montar o SQL"**.  
- **Não** deve haver seta de **"Criar Tabela"** para **"Carregar Dados"**. Se existir, **apague** essa seta (clique nela e delete).  
- O nó "Montar o SQL" deve ter **duas** setas de saída: uma para "Criar Tabela" e outra para "Carregar Dados".  
- Assim "Carregar Dados" recebe só o item com `headers` + arquivo (binary); o Postgres não repassa o arquivo.

---

## Resumo por workflow

| Workflow | Tabela Postgres | Delimitador CSV |
|----------|-----------------|-----------------|
| Extração BLOQUEADOS | sibec_bloqueados | vírgula |
| Extração CANCELADOS | sibec_cancelados | vírgula |
| Extração FOLHA PAGAMENTO | sibec_folha_pagamento | vírgula |

---

## Checklist por workflow

Para **cada um** dos 3 (BLOQUEADOS, CANCELADOS, FOLHA PAGAMENTO):

1. **Form "Cadastro Único":** altere `formTitle` e `formDescription` conforme a tabela acima.
2. **Extração Cabeçalho:** substitua o código pelo conteúdo de `n8n_code_sibec_extracao_cabecalho.js`.
3. **Montar o SQL:** substitua o código pelo do arquivo correspondente (ex.: BLOQUEADOS → `n8n_code_sibec_montar_sql_bloqueados.js`).
4. **Carregar Dados:** substitua o código pelo do arquivo correspondente (ex.: BLOQUEADOS → `n8n_code_sibec_carregar_dados_bloqueados.js`).
5. **Criar Tabela** e **Inserir lotes:** deixe como estão (query `{{ $json.sql }}`).
6. Confirme que a **entrada** de "Carregar Dados" vem da saída de **"Montar o SQL"** (não do Postgres).

Depois de configurar, teste enviando o CSV correspondente em cada Form.
