-- =============================================================================
-- Fase 2 – Dicionário de variantes de logradouro (CADU → canônico da Geo).
-- Uma variante (como veio no CADU, normalizada) mapeia para o logradouro
-- canônico (como está na Geo). Melhora o match quando a mesma rua está escrita
-- de várias formas no CADU. Ver GEO_ESTRATEGIA_SANITIZACAO.md.
-- =============================================================================

CREATE TABLE IF NOT EXISTS tbl_logradouro_canonico (
  id SERIAL PRIMARY KEY,
  variante_cadu TEXT NOT NULL,
  logradouro_canonico TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (variante_cadu)
);

COMMENT ON TABLE tbl_logradouro_canonico IS 'Mapa variante (CADU normalizado) → logradouro canônico (Geo). Usado no match mv_familias_geo.';

CREATE INDEX IF NOT EXISTS idx_logradouro_canonico_variante ON tbl_logradouro_canonico (variante_cadu);
