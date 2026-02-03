# Códigos N8N – Workflow Extração CADU

Ordem dos nós: **Form** → **Extração Cabeçalho** → **Montar CREATE** → **Postgres Criar tabela** → **Carregar dados (lotes)** → **Postgres Inserir lotes** → **Code Executar views uma vez** → **Postgres Criar/recriar views**.

---

## 1. Code "Extração Cabeçalho" (atualizar o que você já tem)

**Objetivo:** Ler só a primeira linha do CSV, normalizar `.` → `_`, e **repassar o binário** para os nós seguintes.

Substitua o código atual por este (a única mudança é incluir `binary: item.binary` no retorno):

```javascript
// N8N Code node: extrai só o cabeçalho do CSV e repassa o arquivo (binary)
const item = $input.first();

if (!item.binary || Object.keys(item.binary).length === 0) {
  throw new Error('Nenhum arquivo recebido. Verifique o campo "Insira o CSV" no Form.');
}

const binaryKey = Object.keys(item.binary)[0];
const buffer = await this.helpers.getBinaryDataBuffer(0, binaryKey);
const content = buffer.toString('utf-8');

const firstLine = content.split(/\r?\n/)[0];
if (!firstLine) {
  throw new Error('CSV vazio ou sem cabeçalho.');
}

const headersOriginal = firstLine.split(';').map(h => h.trim());
const headers = headersOriginal.map(h => h.replace(/\./g, '_'));

// Repassa o binário para os próximos nós (CREATE + carga)
return [{
  json: {
    headers,
    headersOriginal,
    colCount: headers.length
  },
  binary: item.binary
}];
```

---

## 2. Code "Montar CREATE"

**Objetivo:** Receber o item (com `headers` e `binary`), montar o SQL `DROP + CREATE TABLE cadu_raw` a partir dos `headers`, e devolver o mesmo item com `sql` para o Postgres executar.

**Conexão:** Entrada = saída do nó "Extração Cabeçalho".

```javascript
// N8N Code node: monta o SQL CREATE TABLE a partir dos headers (tudo TEXT)
const item = $input.first();
const { headers } = item.json;

const colunas = headers.map(h => `    ${h} TEXT`).join(',\n');

const sql = `DROP TABLE IF EXISTS cadu_raw CASCADE;

CREATE TABLE cadu_raw (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
${colunas}
);

CREATE INDEX idx_cadu_raw_cod_familiar_fam ON cadu_raw(d_cod_familiar_fam);
CREATE INDEX idx_cadu_raw_cpf ON cadu_raw(p_num_cpf_pessoa);
CREATE INDEX idx_cadu_raw_nis ON cadu_raw(p_num_nis_pessoa_atual);
CREATE INDEX idx_cadu_raw_created_at ON cadu_raw(created_at);

COMMENT ON TABLE cadu_raw IS 'Tabela raw Cadastro Único (CADU) importados via CSV';`;

return [{
  json: {
    ...item.json,
    sql
  },
  binary: item.binary
}];
```

---

## 3. Postgres "Criar tabela"

**Tipo de nó:** Postgres (ou “Execute Command” se for outro banco).

- **Operation:** Execute Query  
- **Query:** `{{ $json.sql }}`  
- Conexão com o banco **vigilancia**.

Não use código aqui; é só configurar o nó e pegar o `sql` do item anterior.

---

## 4. Code "Carregar dados (lotes)"

**Objetivo:** Ler o CSV do `binary`, pular o cabeçalho, e gerar **um item por lote** com um `INSERT` de até 1000 linhas (valor ajustável). Cada valor é escapado para SQL (`'` → `''`).

**Conexão (obrigatório):** A entrada deste nó **tem de vir do nó "Montar CREATE"**, não do Postgres (o mesmo item que tem `headers` e `binary`).  
Para isso, no N8N você precisa que o **Montar CREATE** repasse o item para o Postgres, e que o **Carregar dados** também receba o item do **Extração Cabeçalho** (duas saídas do mesmo nó: uma para Montar CREATE, outra para Carregar dados).  
Se o N8N não permitir duas saídas, uma alternativa é: Montar CREATE → Postgres Criar tabela; e **Montar CREATE** também conectado a **Carregar dados** (assim Carregar dados recebe o item que já tem `sql`, `headers` e `binary`). Assim o “Carregar dados” recebe o item com `headers` e `binary`.

**Fluxo sugerido:**  
- Extração Cabeçalho → Montar CREATE → Postgres Criar tabela  
- Montar CREATE → Carregar dados (lotes) → Postgres Inserir lotes  

Assim “Carregar dados” recebe o item que saiu de “Montar CREATE” (com `headers` e `binary`).

```javascript
// N8N Code node: lê o CSV do binary em lotes e gera um INSERT por lote
// IMPORTANTE: Conecte a ENTRADA deste nó à saída do "Montar CREATE", NÃO à saída do Postgres "Criar tabela".
const item = $input.first();
const headers = item.json?.headers;
const TAMANHO_LOTE = 1000;

if (!headers || !Array.isArray(headers)) {
  throw new Error('Item sem "headers". Conecte a ENTRADA deste nó à saída do "Montar CREATE", não à saída do Postgres "Criar tabela".');
}

if (!item.binary || Object.keys(item.binary).length === 0) {
  throw new Error('Arquivo CSV não encontrado no item (binary). Conecte a ENTRADA deste nó à saída do "Montar CREATE".');
}

const binaryKey = Object.keys(item.binary)[0];
const buffer = await this.helpers.getBinaryDataBuffer(0, binaryKey);
const content = buffer.toString('utf-8');

const linhas = content.split(/\r?\n/).filter(l => l.trim());
if (linhas.length < 2) {
  return [{ json: { inserted: 0, message: 'CSV só tem cabeçalho ou está vazio.' } }];
}

const dataLines = linhas.slice(1); // pula cabeçalho

function escapeSql(val) {
  if (val == null || val === '') return 'NULL';
  const s = String(val).replace(/'/g, "''");
  return `'${s}'`;
}

const colList = headers.join(', ');
const saida = [];

for (let i = 0; i < dataLines.length; i += TAMANHO_LOTE) {
  const lote = dataLines.slice(i, i + TAMANHO_LOTE);
  const values = lote.map(linha => {
    const campos = linha.split(';').map(c => c.trim());
    // Garante mesmo número de colunas (preenche vazio se faltar)
    const vals = headers.map((_, idx) => escapeSql(campos[idx] ?? ''));
    return `(${vals.join(', ')})`;
  });
  const sql = `INSERT INTO cadu_raw (${colList}) VALUES ${values.join(', ')}`;
  saida.push({ json: { sql, loteIndex: Math.floor(i / TAMANHO_LOTE) + 1, rows: lote.length } });
}

return saida;
```

**Problema:** o “Carregar dados” precisa do **binary**; depois do Postgres “Criar tabela” o item não tem mais binary. Então o fluxo tem de ser:

- **Extração Cabeçalho** → **Montar CREATE** (repassa json + binary)
- **Montar CREATE** → **Postgres Criar tabela** (usa só `$json.sql`; o Postgres não repassa binary)
- **Montar CREATE** → **Carregar dados** (recebe o item com headers + binary)

Assim “Carregar dados” recebe o item que saiu de “Montar CREATE” (que ainda tem `binary` e `headers`). O nó “Criar tabela” pode ficar só com a conexão de “Montar CREATE” e não precisa repassar item para “Carregar dados”.

Resumo do fluxo:

1. Form → Extração Cabeçalho  
2. Extração Cabeçalho → Montar CREATE  
3. Montar CREATE → Postgres Criar tabela  
4. Montar CREATE → Carregar dados (lotes)  
5. Carregar dados (lotes) → Postgres Inserir lotes  

---

## 5. Postgres "Inserir lotes"

**Tipo de nó:** Postgres.

- **Operation:** Execute Query  
- **Query:** `{{ $json.sql }}`  
- Mesma conexão do banco **vigilancia**.

Cada item que chega é um lote; o nó executa o `INSERT` desse item.

---

## Passo a passo – Fase final (Views)

Esta fase roda **depois** que todos os lotes foram inseridos na `cadu_raw`. Ela recria as views **vw_familias_limpa** e **vw_pessoas_limpa** (com TRIM, CAST e normalização) para o BI e o agente.

### Visão do fluxo atual (até a fase final)

```
Form → Extração Cabeçalho → Montar CREATE → Postgres Criar tabela
                                    ↓
                            Carregar dados (lotes) → Postgres Inserir lotes
                                                              ↓
                                                    [AQUI: Fase final]
```

### O que fazer no N8N (passo a passo)

**Passo 1 – Criar o nó Code "Executar views uma vez"**

1. No N8N, adicione um nó do tipo **Code** após o nó **Postgres "Inserir lotes"**.
2. Nome do nó: **Executar views uma vez**.
3. Conecte a **saída** do nó **Inserir lotes** à **entrada** deste Code (uma seta: Inserir lotes → Executar views uma vez).
4. O "Inserir lotes" devolve **vários itens** (um por lote). Este Code vai receber todos, mas só precisa "disparar" uma vez; ele ignora o conteúdo e devolve **um único item** com o SQL das views.

**Passo 2 – Colar o código no nó "Executar views uma vez"**

Use o **código completo** do arquivo **n8n_code_executar_views_uma_vez.js** (na pasta Vigilancia):

1. Abra **Vigilancia/n8n_code_executar_views_uma_vez.js** no seu editor.
2. Selecione **tudo** (Ctrl+A) e copie (Ctrl+C).
3. No N8N, abra o nó Code "Executar views uma vez" e **cole** (Ctrl+V) substituindo todo o conteúdo.

Pronto. Esse arquivo já contém o SQL inteiro com as regex escapadas (`\\d`) para o JavaScript; não é preciso colar o create_views_cadu.sql nem fazer substituições à mão.

**Passo 3 – Criar o nó Postgres "Criar/recriar views"**

1. Adicione um nó do tipo **Postgres** após o Code **Executar views uma vez**.
2. Nome do nó: **Criar/recriar views**.
3. Conecte a **saída** do Code à **entrada** deste Postgres (Executar views uma vez → Criar/recriar views).
4. No nó Postgres, configure:
   - **Operation:** Execute Query (ou "Run query").
   - **Query:** `{{ $json.sql }}`
   - **Conexão:** mesma do banco **vigilancia** (a mesma usada em "Criar tabela" e "Inserir lotes").

**Passo 4 – Conferir as conexões**

O fluxo deve ficar assim:

| De                    | Para                     |
|-----------------------|--------------------------|
| Inserir lotes         | Executar views uma vez   |
| Executar views uma vez| Criar/recriar views      |

Não conecte "Criar/recriar views" a mais nenhum nó depois (a menos que você queira mostrar sucesso em outro passo). O Postgres vai executar todo o script (funções + DROP VIEW + CREATE VIEW) em uma única chamada.

**Passo 5 – Executar e validar**

1. Rode o workflow (por exemplo, enviando um CSV pelo Form).
2. Espere terminar: Form → … → Inserir lotes → Executar views uma vez → Criar/recriar views.
3. No Postgres, confira se as views existem:
   - `SELECT COUNT(*) FROM vw_familias_limpa;`
   - `SELECT COUNT(*) FROM vw_pessoas_limpa;`

Se aparecer erro no nó "Criar/recriar views", leia a mensagem do Postgres (por exemplo "relation cadu_raw does not exist" = rodou antes da carga; "syntax error" = algum caractere estranho ao colar o SQL). Corrija o SQL ou a ordem dos nós e rode de novo.

**Enquanto isso – Dicionário no Postgres**

Você pode executar o dicionário (tabela auxiliar de códigos) no Postgres **em paralelo** ou antes:

1. **create_tbl_codigos_cadu.sql** – cria a tabela `tbl_codigos_cadu` (nome_campo, cod, descricao).
2. **insert_tbl_codigos_cadu_generated.sql** – insere os 373 registros gerados a partir do dicionário (sexo, raça, escolaridade, etc.).

Execute na ordem: primeiro `create_tbl_codigos_cadu.sql`, depois `insert_tbl_codigos_cadu_generated.sql`. Assim o agente e o BI podem cruzar **vw_pessoas_limpa** e **vw_familias_limpa** com **tbl_codigos_cadu** para obter os descritivos em texto.

---

## 6. Postgres "Criar/recriar views"

**Objetivo:** Após cada upload e carga na `cadu_raw`, recriar as views mestres **v_cadu_familias** e **v_cadu_pessoas** (com CAST, TRIM e normalização para BI e agente). Assim, sempre que houver novo CSV carregado, as views refletem os dados atuais.

**Tipo de nó:** Postgres.

- **Operation:** Execute Query  
- **Query:** conteúdo do arquivo **create_views_cadu.sql** (ver pasta Vigilancia).  
- Mesma conexão do banco **vigilancia**.

**Conexão no fluxo:** A entrada deste nó deve vir da saída do nó **"Inserir lotes"**. Como "Inserir lotes" devolve vários itens (um por lote), use uma das opções:

1. **Opção A (recomendada):** Conectar **"Inserir lotes"** a um nó **"No Op"** ou **"Merge"** (modo "Append") que agrupe os itens e, em seguida, um nó **"Code"** que rode uma única vez e devolva um item com `sql` = texto completo do `create_views_cadu.sql`. Esse item vai para o Postgres **"Criar/recriar views"**.
2. **Opção B:** Conectar **"Inserir lotes"** diretamente ao Postgres **"Criar/recriar views"** e configurar o nó Postgres para **executar uma vez** com o SQL fixo do arquivo (não usar `$json.sql`). Assim, o nó executa o script de views para cada item que chegar (várias vezes, uma por lote). Funciona, mas é redundante; a opção A é mais limpa.
3. **Opção C:** Duas saídas no fluxo: **"Montar CREATE"** → **"Inserir lotes"** (como hoje). **"Montar CREATE"** também → um nó **Code "Montar SQL das views"** que lê o conteúdo do `create_views_cadu.sql` (ou o embute no código) e devolve um item com `sql`; em seguida um **Postgres "Criar/recriar views"** que execute `$json.sql`. Nesse caso, "Criar/recriar views" rodaria em paralelo ao início da carga, não ao final. Para **recriar sempre com novo upload** após a carga, o correto é executar as views **depois** do último lote. Por isso a opção A é a recomendada: ao final dos lotes, disparar uma única execução do script de views.

**Resumo da opção A:**

- **Inserir lotes** → **Code "Executar views uma vez"** → **Postgres "Criar/recriar views"**.
- No Code "Executar views uma vez": devolver **um único item** com `sql` = conteúdo integral do arquivo **create_views_cadu.sql** (copiar do projeto Vigilancia).
- No Postgres "Criar/recriar views": Query = `{{ $json.sql }}`, executar uma vez.

**Exemplo de Code "Executar views uma vez":**

Gera um único item com o script das views. Cole o conteúdo completo de **create_views_cadu.sql** na variável `SQL_VIEWS` (entre as crases `` ` ``). O N8N executa apenas uma vez (usa o último item da etapa anterior só para disparar).

```javascript
// Recebe a saída de "Inserir lotes" (muitos itens); devolve 1 item com o SQL das views
const SQL_VIEWS = `
-- Cole aqui o conteúdo completo do arquivo create_views_cadu.sql
-- (desde CREATE OR REPLACE FUNCTION norm_text até COMMENT ON VIEW vw_pessoas_limpa)
`;

return [{ json: { sql: SQL_VIEWS.trim() } }];
```

Em produção, prefira manter o script no arquivo **create_views_cadu.sql** e carregá-lo (por exemplo com `fs` se o N8N tiver acesso ao disco, ou via nó "Read Binary File" se o CSV e o script estiverem no mesmo repositório).

**O que o create_views_cadu.sql faz:**

- Cria funções de normalização: `norm_text`, `norm_cpf`, `norm_nis`, `norm_cep`, `norm_phone`, `norm_date`, `norm_num`, `norm_int`.
- `DROP VIEW IF EXISTS vw_pessoas_limpa CASCADE; DROP VIEW IF EXISTS vw_familias_limpa CASCADE;` (e nomes antigos).
- **vw_familias_limpa:** uma linha por família (`DISTINCT ON (d_cod_familiar_fam, d_cd_ibge)`), colunas `d_*` + **d_nis_responsavel_fam** (NIS da pessoa com **cod_parentesco_rf_pessoa = 1**, responsável familiar). Colunas com TRIM, CAST e normalização.
- **vw_pessoas_limpa:** uma linha por pessoa (todas as linhas de `cadu_raw`), colunas `p_*` + chave de família, com TRIM, CAST e normalização. Cruzar com **tbl_codigos_cadu** para descritivos (sexo, raça, escolaridade, etc.).

Assim, a cada novo upload, a tabela `cadu_raw` é recriada e populada e, em seguida, as views são recriadas e ficam prontas para o agente e o BI.

**Se o layout do CSV mudar (novos ou menos campos):**

- A **tabela** `cadu_raw` é montada dinamicamente pelo N8N a partir do cabeçalho do CSV, então **novas colunas entram automaticamente** na tabela.
- As **views** (`vw_familias_limpa`, `vw_pessoas_limpa`) são definidas em SQL fixo em **create_views_cadu.sql**. **Novas colunas do CSV ficam fora das views** até que você atualize esse arquivo (inclua a nova coluna na view com a normalização adequada) e execute o script de novo.
- A **tabela auxiliar** **tbl_codigos_cadu** (descritores de códigos) vem do dicionário. Se o governo publicar novo dicionário com novos códigos ou campos, rode `node scripts/gerar_tbl_codigos_from_dicionario.js` e depois execute `insert_tbl_codigos_cadu_generated.sql` (ou atualize manualmente).

---

## Resumo da ordem

| # | Nó                    | Tipo   | O que faz |
|---|------------------------|--------|-----------|
| 1 | Cadastro Único        | Form   | Recebe o CSV |
| 2 | Extração Cabeçalho    | Code   | Lê só a 1ª linha, normaliza nomes, repassa binary |
| 3 | Montar CREATE         | Code   | Gera `sql` (DROP + CREATE + índices) a partir de `headers`, repassa binary |
| 4 | Criar tabela          | Postgres | Executa `$json.sql` (criar cadu_raw) |
| 5 | Carregar dados (lotes)| Code   | Lê CSV do binary, gera vários itens com `sql` (INSERT em lotes de 1000) |
| 6 | Inserir lotes         | Postgres | Para cada item, executa `$json.sql` |
| 7 | Executar views uma vez| Code   | Recebe saída de "Inserir lotes", devolve um item com `sql` = conteúdo de create_views_cadu.sql |
| 8 | Criar/recriar views   | Postgres | Executa `$json.sql` (DROP VIEW + funções + CREATE VIEW vw_familias_limpa e vw_pessoas_limpa) |

Conexões: 2 → 3, 3 → 4, 3 → 5, 5 → 6, 6 → 7, 7 → 8.

---

## Erro 502 (Request failed with status code 502)

**Causa:** O Form (ou quem disparou o workflow) fica esperando o workflow terminar. Se a execução passar do **timeout** do N8N ou do proxy (nginx, etc.), a conexão cai e o navegador recebe 502.

---

### 502 no nó "Criar/recriar views"

O nó Postgres "Criar/recriar views" executa um script longo (8 funções + 4 DROP VIEW + 2 CREATE VIEW sobre `cadu_raw`). Em tabelas grandes, isso pode levar dezenas de segundos ou mais e estourar o timeout.

**O que fazer (em ordem):**

1. **Aumentar timeouts** (igual ao 502 dos lotes):
   - **N8N:** variável de ambiente `N8N_EXECUTION_TIMEOUT=600` (10 min) ou maior; reinicie o N8N.
   - **Proxy (nginx, etc.):** `proxy_read_timeout 600s;` (e `proxy_connect_timeout`, `proxy_send_timeout`).

2. **Desligar temporariamente a criação de views no fluxo:**  
   Desconecte o nó **"Criar/recriar views"** do fluxo (ou desative o nó). O workflow termina logo após "Inserir lotes" e não dá 502. Depois, rode o script das views **à mão** no Postgres:
   - Abra **create_views_cadu.sql** no seu editor.
   - Execute todo o conteúdo no banco (psql, DBeaver, pgAdmin ou outro cliente), na base **vigilancia**, **depois** da carga ter terminado.
   Assim o Form não espera a criação das views.

3. **Manter no fluxo mas com mais tempo:**  
   Se quiser que as views sejam criadas pelo N8N, aumente os timeouts como em (1) e rode de novo. Em bases com muitos registros, o nó "Criar/recriar views" pode levar 1–2 minutos.

---

### 502 no "Inserir lotes" (muitos lotes)

**Soluções (faça em ordem):**

### 1. Reduzir o número de lotes (menos itens = menos tempo)

No Code **"Carregar dados (lotes)"**, aumente `TAMANHO_LOTE` de **1000** para **3000** ou **5000**:

```javascript
const TAMANHO_LOTE = 3000;  // era 1000 → 144 itens vira ~48 itens
```

Assim você terá ~48 itens em vez de 144 (menos chamadas ao Postgres, tende a terminar antes do timeout). Se ainda der 502, use 5000 (~29 itens). Não use valor alto demais (ex.: 20000) para não estourar limite de tamanho do SQL no Postgres.

### 2. Aumentar timeout no N8N (self-hosted)

Se o N8N for self-hosted, aumente o tempo máximo de execução:

- **Variável de ambiente:** `N8N_EXECUTION_TIMEOUT=600` (10 min) ou maior.
- Ou em **Settings** do N8N, se houver opção de "Execution timeout".

Reinicie o N8N após alterar.

### 3. Aumentar timeout no proxy (nginx, Caddy, etc.)

Se o N8N estiver atrás de um proxy reverso, aumente o timeout da requisição (ex.: 10 min):

**Nginx:**
```nginx
proxy_read_timeout 600s;
proxy_connect_timeout 600s;
proxy_send_timeout 600s;
```

**Caddy:** na diretiva `reverse_proxy`, use `transport` com timeout maior (consulte a doc da versão).

### 4. Resposta imediata do Form (avançado)

Para o Form não esperar a carga terminar: fazer o workflow responder ao Form **logo** (ex.: "Carga recebida, processando em segundo plano") e rodar o "Inserir lotes" em outra execução (ex.: outro workflow acionado por webhook com os dados). Isso exige reestruturar o fluxo (salvar lotes em algum lugar e outro processo consumir). Só vale se 1–3 não resolverem.
