-- =============================================================================
-- Criar as 3 tabelas SIBEC de uma vez (bloqueados, cancelados, folha_pagamento)
-- Banco: vigilancia. Rodar uma vez; depois usar N8N para carga (TRUNCATE + INSERT).
-- =============================================================================

\i create_tbl_sibec_bloqueados.sql
\i create_tbl_sibec_cancelados.sql
\i create_tbl_sibec_folha_pagamento.sql

-- Se \i não funcionar no seu cliente, rode os 3 arquivos em sequência:
-- psql -f create_tbl_sibec_bloqueados.sql
-- psql -f create_tbl_sibec_cancelados.sql
-- psql -f create_tbl_sibec_folha_pagamento.sql
