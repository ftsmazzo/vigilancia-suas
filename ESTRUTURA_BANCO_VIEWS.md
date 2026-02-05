# Estrutura do banco e views – Vigilância

Referência das **extrações** (uploads), **tabelas**, **views** e **ordem de execução** para manter tudo atualizado.

---

## Divisão do projeto (escopo)

O projeto tem dois focos distintos:

| Foco | Objetivo | Dados / views principais |
|------|----------|---------------------------|
| **Agenda Form** | Agendamento de visitas e criação de listagem. Tudo que foi usado para criar a aba de Agenda Form serve a esse fim específico. | Visitas, listagens, agendamento (visitas_raw, mv_familia_situacao, mv_cpf_familia_situacao, vw_filtro_controle, etc.). |
| **Vigilância Socioassistencial (números / território)** | Números e territorialidade a partir do CADU. A tabela **Geo** interage **exclusivamente** com **cadu_raw** (e com **vw_familias_limpa**, que deriva do CADU). | cadu_raw, vw_familias_limpa, tbl_geo, **mv_familias_geo** (match Geo × famílias para território e contagem). |

Em resumo: **Geo** é para Vigilância Socioassistencial (território e números de famílias), não para a Agenda Form. A Agenda Form usa suas próprias views e fluxos para visitas e listagem.

---

## 1. Extrações (uploads) que alimentam o banco

Cada extração corresponde a um arquivo/tabela. A carga pode ser feita via **N8N** (workflows) ou, no futuro, pelo upload na aplicação web.

| Extração | Tabela no banco | Script CREATE | Observação |
|----------|-----------------|---------------|------------|
| **CADU** (Cadastro Único) | `cadu_raw` | `create_table_raw.sql` ou dinâmico (N8N) | CSV com `;`, cabeçalho `d.` / `p.` → colunas `d_` / `p_` |
| **SIBEC Bloqueados** | `sibec_bloqueados` | `create_tbl_sibec_bloqueados.sql` | CSV com `,` |
| **SIBEC Cancelados** | `sibec_cancelados` | `create_tbl_sibec_cancelados.sql` | CSV com `,` |
| **SIBEC Folha de Pagamento** | `sibec_folha_pagamento` | `create_tbl_sibec_folha_pagamento.sql` | CSV com `,` |
| **Visitas** (planilha/Sheets) | `visitas_raw` | `create_tbl_visitas.sql` | Google Sheets compartilhado + gatilho de agenda no N8N (não há upload na aplicação). |

**Upload na aplicação:** CADU, SIBEC Bloqueados, SIBEC Cancelados, SIBEC Folha. **Visitas** fica no Google Sheets com gatilho de agenda.

**Ordem sugerida de carga:** 1) CADU; 2) SIBEC (Bloqueados, Cancelados, Folha). Depois de **cada** carga (CADU ou qualquer SIBEC), rodar **"Atualizar todas as views"** na Manutenção para repopular as materialized views (ver abaixo).

---

## 2. Tabelas auxiliares (uma vez)

| Tabela | Script | Uso |
|--------|--------|-----|
| `app.users` | `create_schema_app.sql` | Usuários da aplicação web (login). Aplicado automaticamente na primeira subida do container. |
| `tbl_codigos_cadu` | `create_tbl_codigos_cadu.sql` + `insert_tbl_codigos_cadu_generated.sql` | Descritores do dicionário (sexo, raça, etc.). Gerar inserts com `node scripts/gerar_tbl_codigos_from_dicionario.js`. |
| `tbl_geo` | `create_tbl_geo.sql` | Base de endereços/CEP do município (geo.csv). Carga: ver `GEO_ESTRATEGIA_SANITIZACAO.md` e script de carga. **Georreferenciamento:** cruzar com CADU por CEP + logradouro normalizado (não só CEP). |
**Schemas:** O schema **`app`** tem só a tabela `app.users` (login). As **funções** (`norm_cpf`, `norm_cod_familiar`, etc.) e as **sequências** (`cadu_raw_id_seq`, `sibec_*_id_seq`, etc.) ficam no schema **`public`**, junto com as tabelas de extração e as views. É normal o schema app não listar funções/sequências — elas estão em public.

---

## 3. Views e materialized views – lista completa

**Views descartadas (fora do projeto):** `vw_grupos_populacionais`, `vw_grupos_populacionais_pessoa`, `vw_contagem_por_grupo` — foram usadas em uma ação específica e não fazem parte do projeto. O script `create_view_grupos_populacionais.sql` existe no repositório apenas como referência; não é executado na criação/ordem padrão.

### 3.1 Views CADU (dependem de `cadu_raw`)

| Objeto | Tipo | Script | Precisa refresh? |
|--------|------|--------|-------------------|
| `vw_familias_limpa` | VIEW | `create_views_cadu.sql` | Não (view normal; pesada para Power BI) |
| `vw_pessoas_limpa` | VIEW | `create_views_cadu.sql` | Não |
| `mv_familias_limpa` | MATERIALIZED VIEW | `create_mv_familias_limpa.sql` | **Sim** (para Power BI use esta em vez da view) |

**Ordem:** Rodar `create_views_cadu.sql` **depois** da primeira carga do CADU. Para Power BI não dar timeout em “famílias”, rodar **create_mv_familias_limpa.sql** uma vez; depois o refresh de `mv_familias_limpa` entra no “Atualizar todas as views”. Contém também as funções de normalização (`norm_cpf`, `norm_cod_familiar`, etc.).

### 3.2 Família / CPF / Visitas (dependem de CADU + SIBEC + visitas_raw)

| Objeto | Tipo | Script | Precisa refresh? |
|--------|------|--------|-------------------|
| `mv_familia_situacao` | MATERIALIZED VIEW | `create_view_familia_cpf_visitas.sql` | **Sim** |
| `mv_cpf_familia_situacao` | MATERIALIZED VIEW | `create_view_familia_cpf_visitas.sql` | **Sim** |
| `vw_cpf_situacao` | VIEW | `create_view_familia_cpf_visitas.sql` | Não |
| `vw_filtro_controle` | VIEW | `create_view_familia_cpf_visitas.sql` | Não |

**Refresh:** `refresh_familia_cpf_visitas.sql` (ou painel) → `REFRESH MATERIALIZED VIEW mv_familia_situacao;` e `mv_cpf_familia_situacao`. A `mv_familias_limpa` é atualizada no bloco **Geo** (junto com as MVs de match), pois o match lê dela.

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

### 3.4 Geo (opcional; depende de tbl_geo carregada)

| Objeto | Tipo | Script | Precisa refresh? |
|--------|------|--------|-------------------|
| `norm_logradouro_para_match(t)` | FUNÇÃO | `create_geo_match.sql` | Não |
| `mv_familias_geo` | MATERIALIZED VIEW | `create_geo_match.sql` | **Sim** |
| `mv_familias_geo_por_logradouro` | MATERIALIZED VIEW | `create_geo_match.sql` | **Sim** |
| `vw_familias_territorio` | VIEW | `create_geo_match.sql` | Não (lê das MVs) |

**Ordem:** criar `tbl_geo`, carregar geo.csv (upload na página Geolocalização) e rodar `create_geo_match.sql` no banco. Depois: **Atualizar match Geo** no painel após cada upload de Geo ou CADU. **vw_familias_territorio** = todas as famílias: primeiro match CEP+logradouro (mv_familias_geo), senão match só por logradouro (mv_familias_geo_por_logradouro) — assim o CEP da Geo corrige “CEP genérico” sem alterar cadastro e sem Via CEP. Use esta view no sistema (dashboard, bairro, CRAS, consultas). Nenhuma família fica fora do cruzamento.

**Refresh:** painel → ação **geo** → primeiro `REFRESH CONCURRENTLY mv_familias_limpa`, depois `mv_familias_geo` e `mv_familias_geo_por_logradouro`. O match lê de `mv_familias_limpa` (não da view), por isso o refresh fica mais rápido.

**Views normais** (vw_familias_limpa, vw_pessoas_limpa, vw_cpf_situacao, vw_filtro_controle, vw_folha_rf) são atualizadas automaticamente. As **materialized views** (mv_*) precisam de refresh após nova carga.

---

## 4. Ordem de criação (primeira vez ou recriar tudo)

1. `create_schema_app.sql` (app.users)
2. `create_table_raw.sql` ou tabela gerada pelo upload CADU (cadu_raw)
3. `create_tbl_sibec_bloqueados.sql`, `create_tbl_sibec_cancelados.sql`, `create_tbl_sibec_folha_pagamento.sql`
4. `create_tbl_visitas.sql`
5. `create_tbl_codigos_cadu.sql` + `insert_tbl_codigos_cadu_generated.sql`
6. `create_views_cadu.sql` (funções + vw_familias_limpa, vw_pessoas_limpa)
7. `create_view_familia_cpf_visitas.sql` (mv_familia_situacao, mv_cpf_familia_situacao, vw_cpf_situacao, vw_filtro_controle)
8. `create_view_folha_rf.sql` (MVs da folha + vw_folha_rf)

---

## 5. Manutenção: repopular views após carga

**Views normais** (vw_* sem mv_): atualizam sozinhas quando os dados das tabelas mudam; não é preciso fazer nada.

**Materialized views** (mv_*): precisam ser **repopuladas** após cada carga de CADU ou SIBEC (e, se usar Geo, após carga de Geo). Na aplicação web (Manutenção ou Geolocalização):

1. Depois de fazer upload de **CADU**, **Bloqueados**, **Cancelados** ou **Folha de Pagamento**, clique em **"Atualizar todas as views"**.
2. Isso executa em sequência: refresh de `mv_familia_situacao` e `mv_cpf_familia_situacao`, depois refresh das 5 MVs da Folha RF e, por fim, **refresh de `mv_familias_geo` e `mv_familias_geo_por_logradouro`** (match Geo).
3. Se você **só** atualizou a base Geo (upload na página Geolocalização), pode clicar em **"Atualizar match Geo"** (só essa MV) na mesma página — ou usar **"Atualizar todas as views"** para manter tudo em dia.

**Por que usar materialized view para Geo?** O match entre CADU e Geo (CEP + logradouro normalizado) é um join pesado. Se fosse uma view normal, cada consulta recalcularia esse join e o servidor poderia ir a 100% de CPU. Com **mv_familias_geo**, o resultado fica armazenado e a consulta é rápida; o custo do join acontece só quando você roda o refresh no painel (após atualizar CADU ou Geo).

Assim as consultas (Agenda Forms, território, etc.) passam a refletir os dados novos.

---

## 5.1 Restaurar views (quando sumiram ou deram erro)

Se ao clicar em **"Atualizar todas as views"** aparecer erro do tipo `relation "mv_cpf_familia_situacao" does not exist`, ou se as views sumiram do banco, é porque as views/materialized views ainda não foram criadas (ou foram dropadas). O refresh **só atualiza** MVs que já existem; **não cria** nada.

**O que fazer:** rodar no banco `vigilancia` os scripts de **criação** na ordem abaixo (via psql, DBeaver ou outro cliente). Garanta que as tabelas de dados já existam (cadu_raw, sibec_bloqueados, sibec_cancelados, sibec_folha_pagamento, visitas_raw).

1. `create_views_cadu.sql` — funções de normalização + `vw_familias_limpa`, `vw_pessoas_limpa`
2. `create_view_familia_cpf_visitas.sql` — `mv_familia_situacao`, `mv_cpf_familia_situacao`, `vw_cpf_situacao`, `vw_filtro_controle`
3. `create_view_folha_rf.sql` — 5 MVs da folha + `vw_folha_rf`
4. **Geo (opcional):** `create_tbl_geo.sql` → carregar geo.csv (upload na página Geolocalização) → `create_geo_match.sql` — `norm_logradouro_para_match`, `mv_familias_geo`. Depois: **Atualizar match Geo** no painel. Ver **GUIA_GEO.md**.

Exemplo com psql (na raiz do repositório):

```bash
psql -d vigilancia -f create_views_cadu.sql
psql -d vigilancia -f create_view_familia_cpf_visitas.sql
psql -d vigilancia -f create_view_folha_rf.sql
```

Depois disso, **"Atualizar todas as views"** na Manutenção volta a funcionar e a consulta (Agenda Forms) passa a usar `vw_filtro_controle` normalmente.

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
