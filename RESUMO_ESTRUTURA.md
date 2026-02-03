# Resumo da estrutura – Vigilância (CADU)

## 1. O que existe na pasta

| Item | Descrição |
|------|-----------|
| **create_table_raw.sql** | CREATE da tabela raw (versão Dezembro). Tabela `cadu_raw`, 211 colunas TEXT + `id` + `created_at`. |
| **Dezembro/** | Extração dezembro: `tudo.csv`, `dicionariotudo.csv`. |
| **Janeiro/** | Extração janeiro: `tudo.csv`, `dicionariotudo.csv`, `script_postgres_tudo.sql`, `LEIAMEtudo.txt`. |
| **geo.csv** | Tabela auxiliar de georreferenciamento (CEP, lat/long, CRAS, CREAS). |
| **tbl_educacao.csv** | Tabela auxiliar de escolas (código INEP – cruza com CADU). |
| **tbl_saude.csv** | Tabela auxiliar de unidades de saúde (CNES/EAS – cruza com CADU). |

---

## 2. create_table_raw.sql (Dezembro) – sua base

- **Tabela:** `cadu_raw`
- **Colunas:** 211 campos do CSV em **TEXT** + `id` SERIAL + `created_at` TIMESTAMP.
- **Nomenclatura:** prefixos **d_** (domicílio/família) e **p_** (pessoa), sem pontos.  
  Ex.: `d_cd_ibge`, `d_cod_familiar_fam`, `p_nom_pessoa`, `p_num_cpf_pessoa`.
- **CSV:** cabeçalho usa **d.** e **p.** (ex.: `d.cd_ibge`, `p.nom_pessoa`). Na carga é preciso mapear `d.campo` → `d_campo` e `p.campo` → `p_campo`.
- **Delimitador do CSV:** ponto e vírgula (`;`).
- **Índices:** `d_cod_familiar_fam`, `p_num_cpf_pessoa`, `p_num_nis_pessoa_atual`, `created_at`.

Esse script está alinhado com a estratégia **raw + views**: tudo TEXT, sem inferência de tipo, pronto para receber qualquer extração que use o mesmo conjunto de colunas.

---

## 3. script_postgres_tudo.sql (Janeiro) – por que não funciona

- Cria **tbl_tudo** com tipos inferidos (VARCHAR(11), NUMERIC(1,0), etc.) – mesmo problema que você teve com DBeaver (tamanhos fixos, campos vazios).
- **Colunas duplicadas:** o script coloca primeiro o bloco **pessoa** e depois o bloco **família** na mesma tabela, **sem** prefixos. Com isso aparecem duas vezes:
  - `cod_familiar_fam` (linhas 2 e 132)
  - `ref_cad` (linhas 130 e 204)
  - `ref_pbf` (linhas 131 e 205)
- No PostgreSQL (e na maioria dos bancos) não é permitido duas colunas com o mesmo nome, então o script falha ao criar a tabela.

Conclusão: o script de janeiro não é utilizável como está. A abordagem do **create_table_raw.sql** (prefixos d_/p_ e tudo TEXT) é a correta para uma única tabela “tudo” com dados de família e pessoa.

---

## 4. Diferença de colunas entre Dezembro e Janeiro (CSV)

- **Dezembro (tudo.csv):** 211 colunas.
- **Janeiro (tudo.csv):** 211 colunas.
- **Diferença:** nenhuma. O conjunto de colunas é **idêntico** entre os dois meses.

Ou seja: hoje o **create_table_raw.sql** serve para as duas extrações (dez e jan). Quando surgir uma nova versão do CadÚnico com **mais** ou **menos** colunas, aí sim será preciso gerar um novo CREATE (e aí entra a automação no N8N: ler o cabeçalho do CSV e montar o CREATE dinâmico).

---

## 5. Dicionários

- **Dezembro/dicionariotudo.csv** e **Janeiro/dicionariotudo.csv**: mesma estrutura (`campo`; `descricao`; `resposta`), explicando o significado de cada campo e, quando há, as opções de resposta.
- Úteis para documentar as views mestres (Pessoas e Família) e para BI/agentes saberem o que cada coluna significa.

---

## 6. Tabelas auxiliares (para depois)

| Arquivo | Campos principais | Uso provável |
|---------|--------------------|--------------|
| **geo.csv** | endereco, bairro, cep, id_endereco, id_cidade, id_bairro, lat_num, long_num, cras, creas | Cruzar CEP do CADU com georreferenciamento e CRAS/CREAS. |
| **tbl_educacao.csv** | municipio, codigo_inep, escola, categoria, endereco, telefone | Cruzar com código INEP da escola no CADU (ex.: p.cod_censo_inep_memb). |
| **tbl_saude.csv** | cnes, unidade, telefone, endereco, indice | Cruzar com código EAS do CADU (ex.: d.cod_eas_fam). |

CEP em **geo** está só com números (ex.: 14065779); no CADU vem como **d.num_cep_logradouro_fam** (pode ter formatação). Nas views mestres, normalizar CEP para só dígitos (como combinado) facilita o join.

---

## 7. Resumo rápido para automação (N8N)

1. **Hoje:** O **create_table_raw.sql** já cobre Dezembro e Janeiro (mesmas 211 colunas). Carga raw = ler o CSV (delimitador `;`), mapear cabeçalho `d.campo` → `d_campo` e `p.campo` → `p_campo`, e inserir em `cadu_raw` (id e created_at preenchidos pelo banco).
2. **Quando o CadÚnico mudar:** Nova extração pode trazer mais ou menos colunas. A automação pode: ler só a primeira linha do CSV → lista de colunas → montar `CREATE TABLE cadu_raw (id SERIAL, created_at TIMESTAMP, col1 TEXT, col2 TEXT, ...)` com um nome de coluna por campo (ex.: ponto vira underscore), depois `DROP TABLE IF EXISTS cadu_raw` e criar de novo.
3. **Script de janeiro:** Não usar o script que gera `tbl_tudo` com colunas duplicadas; manter a lógica do create_table_raw (prefixos d_/p_, tudo TEXT).

Se quiser, no próximo passo podemos desenhar o fluxo do N8N (ler CSV → gerar CREATE → DROP/CREATE → carga em lotes) ou esboçar as views mestres Pessoas e Família a partir da `cadu_raw`.
