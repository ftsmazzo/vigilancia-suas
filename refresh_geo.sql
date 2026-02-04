-- Refresh da materialized view de match Geo × CADU.
-- Execute após atualizar tbl_geo (upload) ou cadu_raw (upload CADU).
-- Requer índice único em mv_familias_geo para CONCURRENTLY.

REFRESH MATERIALIZED VIEW CONCURRENTLY mv_familias_geo;
