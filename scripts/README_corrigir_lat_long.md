# Correção de lat/long por CEP e endereço

O script `corrigir_lat_long_por_cep.js` usa **AwesomeAPI** (por CEP) e **Nominatim** (por endereço, 1 req/s) para obter coordenadas corretas e gerar:

- **correcao_lat_long.csv** — colunas: endereco; bairro; cep; lat; lng
- **update_tbl_ceps_lat_long.sql** — `UPDATE` em `tbl_ceps` (lat_char, long_char) por CEP e endereço

## Uso

1. Edite o script e cole seus dados na variável `dadosBrutos`: uma linha por endereço, campos separados por **tab**: `endereco \t bairro \t cep \t lat \t long`.
2. Na raiz do projeto: `node scripts/corrigir_lat_long_por_cep.js`.
3. Execute o SQL gerado no PostgreSQL para atualizar a `tbl_ceps`.

A Nominatim é usada só para linhas em que a AwesomeAPI não retornou coordenadas (limite de 1 requisição por segundo).
