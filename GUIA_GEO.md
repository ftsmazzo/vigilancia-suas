# Guia passo a passo – Geo (georreferenciamento)

**Cenário:** você está na **máquina local**; o projeto roda no **EasyPanel**; você acessa o banco pelo **PGAdmin** (conexão com o Postgres do EasyPanel). Você **não** tem acesso ao diretório do projeto no servidor — só ao banco.  
Todos os passos abaixo são feitos **no PGAdmin** (abrir e executar os scripts SQL) e, na carga, no seu PC (ter o arquivo `geo.csv` e, se quiser, gerar o SQL de carga).

---

## Pré-requisito

- Banco **vigilancia** no EasyPanel acessível pelo PGAdmin.
- **CADU** já carregado em **cadu_raw** (para existir dados e, depois, as views).

---

## Passo 1 – Views CADU (se ainda não rodou)

As funções de normalização (`norm_cep`, `norm_text`, etc.) e as views do CADU precisam existir.

1. No seu PC, abra o arquivo **create_views_cadu.sql** (cópia do repositório ou do projeto).
2. No PGAdmin: conecte ao banco **vigilancia** → abra o **Query Tool**.
3. Cole o conteúdo de **create_views_cadu.sql** e execute (F5 ou botão Run).

Se já tiver rodado antes, pode pular. Isso cria `vw_familias_limpa` e `vw_pessoas_limpa`.

---

## Passo 2 – Criar a tabela Geo

1. No seu PC, abra o arquivo **create_tbl_geo.sql**.
2. No PGAdmin (Query Tool no banco **vigilancia**): cole o conteúdo e execute.

Isso cria **tbl_geo** vazia (colunas do geo.csv + `cep_norm`).

---

## Passo 3 – Carregar o geo.csv na tbl_geo

**Recomendado (automático):** use a **Manutenção** da aplicação web (menu Admin). Lá há o formulário **"Geo (endereços/CEP município)"**: escolha o **geo.csv** e clique em **Enviar**. A aplicação faz TRUNCATE, INSERT em lotes e preenche **cep_norm**. Não precisa PGAdmin nem Import manual.

Se a tabela **tbl_geo** ainda não existir, a aplicação avisa: *"Execute create_tbl_geo.sql no banco (PGAdmin) primeiro."* Depois disso, todos os carregamentos podem ser feitos pelo upload na Manutenção.

---

**Alternativas (se não puder usar o upload da aplicação):**

### Opção B – Staging no PGAdmin

1. Execute **create_tbl_geo_staging.sql** no PGAdmin.
2. Import do **geo.csv** na **tbl_geo_staging** (tudo TEXT → sem erro de "NULL" em numérico).
3. Execute **load_geo_from_staging.sql** para copiar para tbl_geo e preencher cep_norm.

### Opção C – Gerar SQL no PC e rodar no PGAdmin

Na raiz do repositório (com geo.csv e scripts/load-geo.js): `node scripts/load-geo.js`. Depois execute o **load_geo_generated.sql** no PGAdmin.

---

## Passo 4 – Função de normalização + materialized view de match

O script faz um join pesado; em bases grandes pode dar **timeout**. Faça assim:

### Opção A – Em 2 etapas (recomendado se já deu timeout)

1. **Aumentar o timeout do PGAdmin:** File → Preferences → **Query Tool** → **Query execution timeout** → coloque **0** (sem limite) ou **3600** (1 hora). Confirme.
2. No Query Tool (banco **vigilancia**), execute primeiro **create_geo_match_step1.sql** (função + DROP + CREATE da MV). Aguarde até concluir (pode levar vários minutos).
3. Depois execute **create_geo_match_step2.sql** (índice único + comentário). É rápido.

### Opção B – Script único

1. Aumente o timeout do PGAdmin como acima.
2. Execute **create_geo_match.sql** inteiro (já inclui `SET statement_timeout = '0'` para o servidor).

Isso cria:

- **norm_logradouro_para_match(t)** – normaliza endereço para comparação.
- **mv_familias_geo** – materialized view: famílias do CADU que deram match com a Geo (CEP + logradouro normalizado). **Sempre use esta MV nas consultas** — não use view que recalcula o join a cada query (isso sobrecarrega o servidor). Refresh no painel após atualizar Geo ou CADU.

---

## "canceling statement due to user request" — o que fazer?

Essa mensagem significa que o **cliente** (PGAdmin ou outro) **cancelou** a query — em geral por timeout automático. O servidor não falhou; quem cortou foi o programa que você usa para rodar o SQL.

**Solução:** rodar o **create_geo_match_step1.sql** pelo **terminal**, com **psql**, para o cliente não cancelar:

1. Abra o **PowerShell** ou **Prompt de comando** (na pasta do projeto ou onde estão os arquivos .sql).
2. Use a **mesma conexão** do seu banco (host, porta, usuário, senha, nome do banco). Exemplo (substitua pelos seus dados):

```bash
psql "postgresql://USUARIO:SENHA@HOST:PORTA/vigilancia" -f create_geo_match_step1.sql
```

Exemplo com variável de ambiente (se você tiver `DATABASE_URL` no .env):

```bash
# No PowerShell, se tiver DATABASE_URL no .env:
# $env:PGPASSWORD = "sua_senha"
psql -h SEU_HOST -p 5432 -U SEU_USUARIO -d vigilancia -f create_geo_match_step1.sql
```

O psql pede a senha (ou use `PGPASSWORD=sua_senha` no ambiente). **Deixe o terminal aberto** até aparecer "CREATE MATERIALIZED VIEW". Depois rode o step2 (pode ser no PGAdmin): **create_geo_match_step2.sql**.

Se você **não tiver psql** instalado: instale o PostgreSQL client (só os "Command Line Tools") ou use o psql dentro do Docker do Postgres, por exemplo: `docker exec -i NOME_CONTAINER_POSTGRES psql -U usuario -d vigilancia < create_geo_match_step1.sql`.

---

## Por que dava 100% de CPU ao ver dados de famílias + Geo?

Se você usava uma **view normal** que fazia o join entre CADU e Geo (CEP + logradouro normalizado), **cada consulta** recalculava esse join sobre todas as famílias e todos os endereços da Geo — o servidor ia a 100% de CPU e a resposta demorava ou travava. A solução é usar **materialized view** (`mv_familias_geo`): o resultado do match fica gravado; a consulta só lê essa tabela. O custo do join acontece **só quando você roda o refresh** no painel (após atualizar CADU ou Geo). Sempre consulte `mv_familias_geo`, nunca uma view que recalcule o match a cada query.

---

## Passo 5 – Conferir

No PGAdmin (Query Tool):

```sql
SELECT COUNT(*) FROM mv_familias_geo;

SELECT d_cd_ibge, d_cod_familiar_fam, d_nom_logradouro_fam, d_num_cep_logradouro_fam,
       bairro_geo, cras_geo, confianca_match
FROM mv_familias_geo
LIMIT 20;
```

---

## Resumo (cenário: só PGAdmin + arquivos no seu PC)

| # | Ação | Onde |
|---|------|------|
| 1 | Views CADU | PGAdmin: **create_views_cadu.sql** → Query Tool → Executar |
| 2 | Tabela Geo | PGAdmin: **create_tbl_geo.sql** → Query Tool → Executar |
| 3 | Carga Geo | **Recomendado:** Manutenção da aplicação → upload **Geo** → enviar geo.csv. **Ou** staging/load_geo no PGAdmin (ver texto acima). |
| 4 | Match Geo | PGAdmin: aumentar timeout (Preferences → Query Tool). Executar **create_geo_match_step1.sql**, aguardar; depois **create_geo_match_step2.sql**. Ou **create_geo_match.sql** inteiro. |
| 5 | Conferir | PGAdmin: SELECT em mv_familias_geo. Depois: use &quot;Atualizar match Geo&quot; no painel (Geolocalização ou Manutenção) após cada upload de Geo ou CADU. |

Os arquivos **.sql** e o **geo.csv** você pode ter em cópia local (por exemplo, clonando o repositório no seu PC ou baixando só esses arquivos). Nada disso precisa rodar dentro do EasyPanel.

---

## Análise CEP × logradouro (últimos 24 meses)

Para medir o volume de cadastros **atualizados nos últimos 24 meses** em que o CEP existe na Geo mas o **endereço diverge** (ex.: CEP genérico):

- **No painel:** Admin → Geolocalização → seção **"Análise CEP × logradouro (últimos 24 meses)"** → **Calcular análise**. O resultado mostra totais, quantos têm CEP na Geo e quantos coincidem vs divergem.
- **No PGAdmin:** execute o script **analise_cep_logradouro_24m.sql** (requer `norm_logradouro_para_match`, `vw_familias_limpa`, `tbl_geo`). O SELECT retorna uma linha com: `total_familias_24m`, `com_cep_preenchido_24m`, `cep_existe_na_geo_24m`, `endereco_coincide_24m`, `endereco_divergente_24m`.

---

## Próximos passos (depois da Fase 1)

- **Cruzamento:** Use **mv_familias_geo** (só famílias que bateram na Geo). Famílias e pessoas se ligam por código familiar; para território (CRAS, bairro, lat/long), faça JOIN com mv_familias_geo. Nenhuma view extra.
- **Via CEP:** Objetivo = enriquecer a **tbl_geo** com endereços que o CADU tem e a Geo ainda não tem (locais novos). Depois do refresh, mais famílias entram na mv_familias_geo.
