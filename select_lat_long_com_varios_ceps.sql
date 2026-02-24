-- =============================================================================
-- Latitudes e longitudes que contêm mais de um CEP (tbl_ceps)
-- Cada CEP deveria ter um ponto; se a mesma lat/long aparece para vários CEPs,
-- provavelmente é coordenada genérica/errada (ex.: centro da cidade).
-- =============================================================================

-- Resumo: lat_char, long_char, quantidade de CEPs distintos, lista de CEPs
SELECT
  lat_char,
  long_char,
  COUNT(DISTINCT TRIM(REPLACE(REPLACE(COALESCE(cep, ''), '-', ''), ' ', ''))) AS qtd_ceps,
  STRING_AGG(
    DISTINCT TRIM(REPLACE(REPLACE(COALESCE(cep, ''), '-', ''), ' ', '')),
    ', ' ORDER BY TRIM(REPLACE(REPLACE(COALESCE(cep, ''), '-', ''), ' ', ''))
  ) AS ceps
FROM public.tbl_ceps
WHERE lat_char IS NOT NULL
  AND long_char IS NOT NULL
  AND TRIM(COALESCE(lat_char, '')) != ''
  AND TRIM(COALESCE(long_char, '')) != ''
GROUP BY lat_char, long_char
HAVING COUNT(DISTINCT TRIM(REPLACE(REPLACE(COALESCE(cep, ''), '-', ''), ' ', ''))) > 1
ORDER BY qtd_ceps DESC;


-- Detalhado: mesma informação + lista de endereços (uma linha por lat/long com vários CEPs)
-- Descomente o bloco abaixo se quiser ver os endereços agrupados por lat/long.
/*
SELECT
  t.lat_char,
  t.long_char,
  COUNT(DISTINCT TRIM(REPLACE(REPLACE(COALESCE(t.cep, ''), '-', ''), ' ', ''))) AS qtd_ceps,
  STRING_AGG(
    TRIM(REPLACE(REPLACE(COALESCE(t.cep, ''), '-', ''), ' ', '')) || ' | ' || COALESCE(t.endereco, '') || ' | ' || COALESCE(t.bairro, ''),
    E'\n' ORDER BY t.cep, t.endereco
  ) AS ceps_enderecos_bairros
FROM public.tbl_ceps t
WHERE t.lat_char IS NOT NULL
  AND t.long_char IS NOT NULL
  AND TRIM(COALESCE(t.lat_char, '')) != ''
  AND TRIM(COALESCE(t.long_char, '')) != ''
GROUP BY t.lat_char, t.long_char
HAVING COUNT(DISTINCT TRIM(REPLACE(REPLACE(COALESCE(t.cep, ''), '-', ''), ' ', ''))) > 1
ORDER BY qtd_ceps DESC;
*/
