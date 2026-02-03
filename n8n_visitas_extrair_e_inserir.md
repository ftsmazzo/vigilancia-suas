# Inserir dados de Entrevistas (Sheets) em visitas_raw

## Fluxo no N8N

1. **Schedule Trigger** → **Get row(s) in sheet** (já existe)
2. **Code: Montar SQL visitas** (novo) – recebe as linhas do Sheets e monta um único SQL (TRUNCATE + INSERT em lote)
3. **Postgres: Execute Query** (novo) – executa o `sql` gerado pelo Code

Assim você **sempre substitui** a tabela pela planilha atual: sem duplicatas e sem precisar de chave única.

---

## Nó 1: Code – "Montar SQL visitas"

- **Entrada:** saída de "Get row(s) in sheet" (cada item = uma linha da planilha, chaves = cabeçalhos).
- **Ação:** monta `TRUNCATE visitas_raw;` + `INSERT INTO visitas_raw (...) VALUES (...), (...), ...` com escape de aspas.
- **Saída:** um item com `{ "sql": "..." }` para o nó Postgres.

Use o código do arquivo **`n8n_code_visitas_montar_sql.js`** (copiar todo o conteúdo no nó Code).

---

## Nó 2: Postgres – "Inserir visitas"

- **Operação:** Execute Query
- **Query:** `{{ $json.sql }}`
- **Entrada:** o único item vindo do Code (contém o SQL completo).

Roda uma vez por execução; o SQL já faz TRUNCATE + todos os INSERTs.

---

## Alternativa: só evitar duplicatas (sem apagar tudo)

Se quiser **não** apagar a tabela e só inserir linhas novas (por exemplo, por carimbo + CPF + nome):

1. No banco, crie uma constraint única e use `ON CONFLICT` (veja `create_tbl_visitas_unique.sql` e a query de INSERT com ON CONFLICT abaixo).
2. No N8N, use o mesmo Code que gera apenas o `INSERT ... ON CONFLICT DO NOTHING` (sem TRUNCATE), ou um INSERT por item com ON CONFLICT.

A abordagem **TRUNCATE + INSERT em lote** (acima) é a mais simples e garante que o Postgres fique igual à planilha a cada execução.
