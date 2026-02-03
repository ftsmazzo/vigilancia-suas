# Estrutura do banco e views – Vigilância

Referência das **extrações** (uploads), **tabelas**, **views** e **ordem de execução** para manter tudo atualizado.

---

## 1. Extrações (uploads) que alimentam o banco

Cada extração corresponde a um arquivo/tabela. A carga pode ser feita via **N8N** (workflows) ou, no futuro, pelo upload na aplicação web.

| Extração | Tabela no banco | Script CREATE | Observação |
|----------|-----------------|---------------|------------|
| **CADU** (Cadastro Único) | `cadu_raw` | `create_table_raw.sql` ou dinâmico (N8N) | CSV com `;`, cabeçalho `d.` / `p.` → colunas `d_` / `p_` |
| **SIBEC Bloqueados** | `sibec_bloqueados` | `create_tbl_sibec_bloqueados.sql` | CSV com `,` |
| **SIBEC Cancelados** | `sibec_cancelados` | `create_tbl_sibec_cancelados.sql` | CSV com `,` |
| **SIBEC Folha de Pagamento** | `sibec_folha_pagamento` | `create_tbl_sibec_folha_pagamento.sql` | CSV com `,` |
| **Visitas** (planilha/Sheets) | `visitas_raw` | `create_tbl_visitas.sql` | Carga via N8N (Sheets → TRUNCATE + INSERT) |

**Ordem sugerida de carga:** 1) CADU; 2) SIBEC (Bloqueados, Cancelados, Folha); 3) Visitas. Depois de qualquer carga, rodar os **refreshes** das materialized views (ver abaixo).

---

## 2. Tabelas auxiliares (uma vez)

| Tabela | Script | Uso |
|--------|--------|-----|
| `app.users` | `create_schema_app.sql` | Usuários da aplicação web (login). Aplicado automaticamente na primeira subida do container. |
| `tbl_codigos_cadu` | `create_tbl_codigos_cadu.sql` + `insert_tbl_codigos_cadu_generated.sql` | Descritores do dicionário (sexo, raça, etc.). Gerar inserts com `node scripts/gerar_tbl_codigos_from_dicionario.js`. |

---

## 3. Views e materialized views – lista completa

### 3.1 Views CADU (dependem de `cadu_raw`)

| Objeto | Tipo | Script | Precisa refresh? |
|--------|------|--------|-------------------|
| `vw_familias_limpa` | VIEW | `create_views_cadu.sql` | Não (view normal) |
| `vw_pessoas_limpa` | VIEW | `create_views_cadu.sql` | Não |

**Ordem:** Rodar `create_views_cadu.sql` **depois** da primeira carga do CADU (e quando houver alteração de estrutura). Contém também as funções de normalização (`norm_cpf`, `norm_cod_familiar`, etc.).

### 3.2 Família / CPF / Visitas (dependem de CADU + SIBEC + visitas_raw)

| Objeto | Tipo | Script | Precisa refresh? |
|--------|------|--------|-------------------|
| `mv_familia_situacao` | MATERIALIZED VIEW | `create_view_familia_cpf_visitas.sql` | **Sim** |
| `mv_cpf_familia_situacao` | MATERIALIZED VIEW | `create_view_familia_cpf_visitas.sql` | **Sim** |
| `vw_cpf_situacao` | VIEW | `create_view_familia_cpf_visitas.sql` | Não |
| `vw_filtro_controle` | VIEW | `create_view_familia_cpf_visitas.sql` | Não |

**Refresh:** `refresh_familia_cpf_visitas.sql` → `REFRESH MATERIALIZED VIEW mv_familia_situacao;` e `mv_cpf_familia_situacao`.

### 3.3 Folha RF (dependem de CADU + SIBEC)

| Objeto | Tipo | Script | Precisa refresh? |
|--------|------|--------|-------------------|
| `mv_folha_base` | MATERIALIZED VIEW | `create_view_folha_rf.sql` | **Sim** |
| `mv_folha_linhas` | MATERIALIZED VIEW | `create_view_folha_rf.sql` | **Sim** |
| `mv_folha_bloq` | MATERIALIZED VIEW | `create_view_folha_rf.sql` | **Sim** |
| `mv_folha_canc` | MATERIALIZED VIEW | `create_view_folha_rf.sql` | **Sim** |
| `mv_folha_familias` | MATERIALIZED VIEW | `create_view_folha_rf.sql` | **Sim** |
| `vw_folha_rf` | VIEW | `create_view_folha_rf.sql` | Não |

**Refresh:** `refresh_folha_rf.sql` → `REFRESH MATERIALIZED VIEW CONCURRENTLY` das 5 MVs acima.

### 3.4 Grupos populacionais (dependem de CADU + tbl_codigos_cadu)

| Objeto | Tipo | Script | Precisa refresh? |
|--------|------|--------|-------------------|
| `vw_grupos_populacionais` | VIEW | `create_view_grupos_populacionais.sql` | Não |
| `vw_grupos_populacionais_pessoa` | VIEW | `create_view_grupos_populacionais.sql` | Não |
| `vw_contagem_por_grupo` | VIEW | `create_view_grupos_populacionais.sql` | Não |

---

## 4. Ordem de criação (primeira vez ou recriar tudo)

1. `create_schema_app.sql` (app.users)
2. `create_table_raw.sql` ou tabela gerada pelo N8N (cadu_raw)
3. `create_tbl_sibec_bloqueados.sql`, `create_tbl_sibec_cancelados.sql`, `create_tbl_sibec_folha_pagamento.sql`
4. `create_tbl_visitas.sql`
5. `create_tbl_codigos_cadu.sql` + `insert_tbl_codigos_cadu_generated.sql`
6. `create_views_cadu.sql` (funções + vw_familias_limpa, vw_pessoas_limpa)
7. `create_view_familia_cpf_visitas.sql` (mv_familia_situacao, mv_cpf_familia_situacao, vw_cpf_situacao, vw_filtro_controle)
8. `create_view_folha_rf.sql` (MVs da folha + vw_folha_rf)
9. `create_view_grupos_populacionais.sql` (vw_grupos_populacionais, vw_grupos_populacionais_pessoa, vw_contagem_por_grupo)

---

## 5. Manutenção: manter views atualizadas

**Sempre que houver nova carga** (CADU, SIBEC ou Visitas):

1. Rodar **refresh_familia_cpf_visitas.sql** (ou botão "Refresh Família/CPF/Visitas" na aplicação).
2. Rodar **refresh_folha_rf.sql** (ou botão "Refresh Folha RF" na aplicação).

Na aplicação web (Manutenção), há também a opção **"Atualizar todas as views"**, que executa os dois refreshes em sequência.

---

## 6. CREATE do banco (referência)

Se você gerar um dump do schema do Postgres para referência (estrutura atual do banco):

```bash
pg_dump -d vigilancia --schema-only --no-owner --no-privileges -f schema_vigilancia_referencia.sql
```

Pode guardar como `schema_vigilancia_referencia.sql` no repositório (ou em outro lugar) e atualizá-lo quando alterar tabelas/views. Isso ajuda a documentar o estado atual e a recriar o banco se necessário.

---

## 7. MCP Vigilância

O MCP Vigilância expõe ferramentas do **N8N** (buscar workflows, detalhes, executar). As “extrações” acima são alimentadas pelos workflows que você configurou no N8N; o MCP não expõe diretamente a lista de arquivos ou o schema do banco. Esta documentação serve como referência das extrações e das views para manter tudo alinhado.
