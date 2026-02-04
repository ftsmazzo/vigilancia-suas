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

## Passo 4 – Função de normalização + view de match

1. No seu PC, abra o arquivo **create_geo_match.sql**.
2. No PGAdmin (Query Tool no banco **vigilancia**): cole o conteúdo e execute.

Isso cria:

- **norm_logradouro_para_match(t)** – normaliza endereço para comparação.
- **vw_familias_geo** – famílias do CADU que deram match com a Geo (CEP + logradouro normalizado iguais).

---

## Passo 5 – Conferir

No PGAdmin (Query Tool):

```sql
SELECT COUNT(*) FROM vw_familias_geo;

SELECT d_cd_ibge, d_cod_familiar_fam, d_nom_logradouro_fam, d_num_cep_logradouro_fam,
       bairro_geo, cras_geo, confianca_match
FROM vw_familias_geo
LIMIT 20;
```

---

## Resumo (cenário: só PGAdmin + arquivos no seu PC)

| # | Ação | Onde |
|---|------|------|
| 1 | Views CADU | PGAdmin: **create_views_cadu.sql** → Query Tool → Executar |
| 2 | Tabela Geo | PGAdmin: **create_tbl_geo.sql** → Query Tool → Executar |
| 3 | Carga Geo | **Recomendado:** Manutenção da aplicação → upload **Geo** → enviar geo.csv. **Ou** staging/load_geo no PGAdmin (ver texto acima). |
| 4 | Match Geo | PGAdmin: **create_geo_match.sql** → Query Tool → Executar |
| 5 | Conferir | PGAdmin: SELECT em vw_familias_geo |

Os arquivos **.sql** e o **geo.csv** você pode ter em cópia local (por exemplo, clonando o repositório no seu PC ou baixando só esses arquivos). Nada disso precisa rodar dentro do EasyPanel.

---

## Próximos passos (depois da Fase 1)

- **Fase 2:** tbl_logradouro_canonico (variantes de grafia). Ver **GEO_ESTRATEGIA_SANITIZACAO.md**.
- **Fase 3:** Via CEP em lote com cache. Ver **GEO_ESTRATEGIA_SANITIZACAO.md**.
