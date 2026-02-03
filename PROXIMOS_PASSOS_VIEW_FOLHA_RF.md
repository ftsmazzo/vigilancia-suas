# Próximos passos: View final por RF (planilha completa e limpa)

A view **vw_folha_rf** cruza Folha de Pagamento SIBEC com a base de famílias (CADU), filtra **só Referência Familiar (RF)** e traz endereço/telefone do CADU + motivos de bloqueio/cancelamento. É a planilha “completa e limpa por RF”.

---

## 1. Pré-requisitos (já atendidos se você validou as extrações)

| Ordem | O que precisa existir | Como garantir |
|-------|------------------------|----------------|
| 1 | **CADU** carregado | Workflow Extração CADU executado (cadu_raw populada). |
| 2 | **Views CADU** criadas | Rodar `create_views_cadu.sql` ou nó "Criar Views" do workflow CADU (vw_familias_limpa e vw_pessoas_limpa). |
| 3 | **3 tabelas SIBEC** carregadas | Workflows Extração BLOQUEADOS, CANCELADOS e FOLHA PAGAMENTO executados (sibec_bloqueados, sibec_cancelados, sibec_folha_pagamento populadas). |

Sem isso, a view não encontra dados ou quebra por dependência.

---

## 2. Gerar a view (uma vez ou após cada atualização)

**Opção A – Manual (psql ou cliente SQL)**  
Rodar o script no banco **vigilancia**:

```bash
psql -d vigilancia -f create_view_folha_rf.sql
```

Ou abrir `create_view_folha_rf.sql` no DBeaver/pgAdmin e executar.

**Opção B – N8N (nó “Gerar View Folha RF”)**  
1. Criar um workflow (ex.: “Gerar Views”) com Trigger manual ou agendado.  
2. Adicionar um nó **Code** e colar o conteúdo do arquivo **n8n_code_gerar_view_folha_rf.js** (saída: `{ sql: "..." }`).  
3. Adicionar um nó **Postgres – Execute Query** com query `{{ $json.sql }}`.  
4. Rodar o workflow quando quiser (re)criar a view (ex.: depois de rodar as 3 extrações SIBEC).

O arquivo **n8n_code_gerar_view_folha_rf.js** (ver abaixo) contém o SQL da view para colar no nó Code.

---

## 3. Usar a planilha por RF

Depois de criar/atualizar a view:

```sql
SELECT * FROM vw_folha_rf ORDER BY ref_folha, cod_familiar, nis;
```

- **Exportar para CSV/Excel:** usar “Export” do seu cliente SQL ou um nó N8N (Postgres → Read rows from vw_folha_rf → export).  
- **Colunas da view:** ref_folha, cod_familiar, cpf, nis, nome, tipo_pgto_previsto, tp_benef, vlrbenef, vlrtotal, sitfam, motivo_bloqueio, motivo_cancelamento, endereco_cadu, telefone_cadu.

Uma linha = um registro de Folha que é **Referência Familiar** na base CADU, com endereço e telefone do cadastro e, quando houver, motivo de bloqueio/cancelamento (mais recente).

---

## 4. Quando rodar de novo

- **Sempre que atualizar** CADU ou alguma tabela SIBEC (nova carga), convém **rodar de novo** o script da view (ou o workflow “Gerar View Folha RF”) para a planilha por RF refletir os dados atuais.  
- A view não armazena dados; ela só monta o SELECT na hora da consulta. Recriar a view (DROP + CREATE) só é necessário se você mudar a definição em `create_view_folha_rf.sql`.

---

## 5. Resumo

| Passo | Ação |
|-------|------|
| 1 | Garantir CADU + views CADU + 3 tabelas SIBEC carregadas. |
| 2 | Rodar `create_view_folha_rf.sql` (manual ou via N8N com n8n_code_gerar_view_folha_rf.js). |
| 3 | Consultar `SELECT * FROM vw_folha_rf` e exportar para CSV/Excel = planilha completa e limpa por RF. |
