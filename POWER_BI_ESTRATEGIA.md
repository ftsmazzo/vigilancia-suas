# Power BI – Estratégia segmentada (sem conexão direta estável ao Postgres)

## Por que a “View Família” dá erro e a de Pessoas não?

A **vw_familias_limpa** é muito mais pesada que a **vw_pessoas_limpa**:

- **vw_familias_limpa:** usa `DISTINCT ON` em cima de todo o `cadu_raw` (uma linha por pessoa) e tem uma **subconsulta correlacionada** para calcular o NIS do responsável. Ou seja, a cada leitura o Postgres reprocessa muita coisa e a consulta demora; o Power BI pode dar timeout ou “connection reset”.
- **vw_pessoas_limpa:** é um `SELECT` direto em `cadu_raw`, sem `DISTINCT` nem subconsulta, então é bem mais rápida mesmo com o dobro de linhas.

**Solução:** usar a **materialized view** em vez da view normal para famílias.

- **mv_familias_limpa** – cópia materializada de `vw_familias_limpa`. Os dados são pré-calculados; a leitura é só na tabela, sem recalcular a view. No Power BI, use **mv_familias_limpa** em vez de **vw_familias_limpa** para carregar “famílias”.
- Criar a MV: rodar **create_mv_familias_limpa.sql** no PGAdmin (uma vez, após `create_views_cadu.sql`). Depois, ao clicar em **“Atualizar todas as views”** na Manutenção, a app já faz o refresh de `mv_familias_limpa` junto com as outras MVs.

---

## O problema (conexão direta caindo)

Ao conectar o Power BI **diretamente** ao PostgreSQL no EasyPanel:

- A conexão TCP fica aberta enquanto o Power BI navega nas tabelas/views (muitas colunas, ex.: `vw_pessoas_limpa`, `vw_familias_limpa`).
- O log do Postgres mostra: `could not send data to client: Connection reset by peer` e `connection to client lost`.
- Ou seja: o **cliente** (Power BI) ou algo no meio (rede, proxy, timeout) encerra a conexão antes do servidor terminar de enviar os dados. Em conexões diretas longas isso é comum.

## Ideia da estratégia segmentada

**Não depender de uma conexão direta longa e estável** do Power BI ao Postgres. Em vez disso:

1. **Opção A – Dados via arquivo (recomendada)**  
   A aplicação (ou um script) **exporta** os dados para CSV/Excel; você coloca o arquivo no OneDrive, SharePoint ou numa pasta; o Power BI usa **Obter dados → Arquivo** e atualiza quando o arquivo for atualizado. Zero conexão do Power BI com o Postgres.

2. **Opção B – Power BI consome a API da aplicação (Web)**  
   O Power BI usa **Obter dados da Web** e chama a API da aplicação Vigilância (ex.: `/api/data/export/csv?view=vw_familias_territorio` ou endpoints de query paginada). Quem fala com o Postgres é a app (conexão curta, em chunks); o Power BI só faz HTTP. Exige autenticação na API (token/sessão).

3. **Opção C – Tabelas/views resumidas no Postgres**  
   Criar no banco **tabelas ou views pequenas** só para BI (poucas colunas, eventualmente agregadas). Um job ou o refresh da app popula isso; o Power BI conecta ao Postgres mas só lê essas tabelas. A conexão direta existe, mas as consultas são curtas e leves, reduzindo a chance de “connection reset”.

---

## Opção A – Exportar para CSV e usar no Power BI

### Como obter o CSV

1. **Pela aplicação (logado como admin)**  
   - Acesse:  
     `https://SEU-DOMINIO/api/data/export/csv?view=vw_familias_territorio`  
     ou  
     `https://SEU-DOMINIO/api/data/export/csv?view=vw_pessoas_limpa`  
   - O navegador faz o download do CSV (ou abra a URL e use “Salvar como”).
   - Opcional: `&limit=10000` (máximo de linhas; padrão 50.000).

2. **Onde colocar o arquivo**  
   - OneDrive, SharePoint ou pasta de rede onde o Power BI tenha acesso.
   - Atualização: substitua o arquivo quando houver nova exportação (manual ou agendada).

### No Power BI

1. **Obter dados** → **Texto/CSV** (ou **Arquivo**) e selecione o CSV.
2. Ajuste encoding/delimitador se precisar e carregue.
3. Para atualizar: use **Atualizar** no Power BI; o arquivo na pasta/OneDrive deve ser o mais recente.

### Automatizar a exportação (opcional)

- **N8N / cron:** de tempos em tempos chamar a URL de export (com login/token se a API exigir) e salvar o resultado numa pasta ou OneDrive.
- Ou um **script** (Node ou `psql`) que consulta o banco e gera o CSV nessa pasta.

---

## Opção B – Power BI via API (Web)

1. No Power BI: **Obter dados** → **Web**.
2. URL base, por exemplo:  
   `https://SEU-DOMINIO/api/data/export/csv?view=vw_familias_territorio`  
   Se a API exigir login, o Power BI pode usar “Autenticação básica” ou “Chave de conta” se a app tiver um token para BI.
3. A API devolve os dados em chunks (ou CSV); a conexão ao Postgres fica do lado da app, não do Power BI.

Se a API for paginada (JSON), no Power Query você pode montar uma lista de offsets e combinar as tabelas (mais um passo de configuração, mas evita conexão direta ao banco).

---

## Opção C – Views/tabelas resumidas no Postgres

- Criar, por exemplo, uma **materialized view** ou tabela só para BI, com:
  - Poucas colunas (ex.: códigos, bairro, CRAS, datas, contagens).
  - Dados já agregados, se fizer sentido.
- Refresh dessa MV/tabela: pelo botão “Atualizar views” na app ou por job noturno.
- No Power BI, conectar ao Postgres e importar **apenas** essa tabela/MV.  
Consultas curtas reduzem a chance de “connection reset”, mas a conexão ainda é direta.

---

## Resumo

| Abordagem | Conexão Power BI → Postgres | Pró | Contra |
|-----------|-----------------------------|-----|--------|
| **Direta (atual)** | Sim, longa | Um clique no Power BI | Conexão cai (reset by peer) |
| **A – Arquivo CSV** | Não | Estável; suporta atualização por arquivo | Precisa gerar/substituir o arquivo |
| **B – API (Web)** | Não | Estável; dados “ao vivo” se a API for atualizada | Configurar auth e, se for paginado, Power Query |
| **C – Tabelas resumidas** | Sim, mas curta | Menos colunas/dados, menos chance de cair | Ainda depende de conexão direta |

Recomendação: usar **Opção A** (export CSV + Power BI em cima do arquivo) ou **Opção B** (API) para não depender de conexão direta estável ao Postgres.
