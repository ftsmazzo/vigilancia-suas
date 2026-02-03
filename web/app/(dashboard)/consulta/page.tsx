'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  AGENDA_FORMS_COLUMNS,
  AGENDA_FORMS_FILTERS,
} from '@/lib/agenda-forms-columns';

function toUpper(val: unknown): string {
  if (val == null || val === '') return '—';
  const s = String(val).trim();
  return s ? s.toUpperCase() : '—';
}

/** Contato: apenas dígitos do telefone (remove espaços, texto, caracteres, observações). */
function sanitizeTelefoneDisplay(val: unknown): string {
  if (val == null || String(val).trim() === '') return '—';
  const digits = String(val).replace(/\D/g, '');
  return digits || '—';
}

function formatEndereco(row: Record<string, unknown>): string {
  const rua = row.nome_rua != null ? String(row.nome_rua).trim() : '';
  const num = row.numero != null ? String(row.numero).trim() : '';
  if (!rua && !num) return '—';
  if (!num) return rua ? toUpper(rua) : toUpper(num);
  return toUpper(`${rua}, ${num}`);
}

function whatsAppLink(telefone: unknown): string | null {
  if (telefone == null || String(telefone).trim() === '') return null;
  const digits = String(telefone).replace(/\D/g, '');
  if (digits.length < 10) return null;
  const withCountry = digits.length === 11 && digits.startsWith('0')
    ? '55' + digits.slice(1)
    : digits.length === 10
      ? '55' + digits
      : digits.startsWith('55')
        ? digits
        : '55' + digits;
  return `https://wa.me/${withCountry}`;
}

function getCellValueForCsv(row: Record<string, unknown>, key: string): string {
  if (key === 'endereco') return formatEndereco(row);
  if (key === 'telefone_contato') return sanitizeTelefoneDisplay(row.telefone_contato);
  if (key === 'whatsapp') return whatsAppLink(row.telefone_contato) ?? '—';
  return toUpper(row[key]);
}

function escapeCsvField(val: string): string {
  const s = String(val ?? '');
  if (s.includes('"') || s.includes(',') || s.includes('\n') || s.includes('\r')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function buildCsv(rows: Record<string, unknown>[]): string {
  const header = AGENDA_FORMS_COLUMNS.map(({ label }) => escapeCsvField(label)).join(';');
  const dataRows = rows.map((row) =>
    AGENDA_FORMS_COLUMNS.map(({ key }) => escapeCsvField(getCellValueForCsv(row, key))).join(';')
  );
  return [header, ...dataRows].join('\r\n');
}

function downloadCsv(csv: string, filename: string) {
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

const PAGE_SIZE_OPTIONS = [50, 100, 200, 500];

export default function ConsultaPage() {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(100);

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    const params = new URLSearchParams();
    params.set('limit', String(pageSize));
    params.set('offset', String((page - 1) * pageSize));
    Object.entries(filters).forEach(([k, v]) => {
      if (v.trim()) params.set(k, v.trim());
    });
    fetch(`/api/data/agenda-forms?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
          setRows([]);
          setTotal(0);
        } else {
          setRows(data.rows || []);
          setTotal(data.total ?? 0);
        }
      })
      .catch(() => {
        setError('Erro ao carregar dados.');
        setRows([]);
        setTotal(0);
      })
      .finally(() => setLoading(false));
  }, [filters, page, pageSize]);

  useEffect(() => {
    load();
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleApplyFilters = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
  };

  const goToPage = (p: number) => {
    setPage(Math.max(1, Math.min(p, totalPages)));
  };

  const handleExportCsv = () => {
    const csv = buildCsv(rows);
    const date = new Date().toISOString().slice(0, 19).replace(/[-:T]/g, '').slice(0, 8);
    downloadCsv(csv, `agenda-forms-${date}.csv`);
  };

  const getCellValue = (row: Record<string, unknown>, key: string): string | React.ReactNode => {
    if (key === 'endereco') return formatEndereco(row);
    if (key === 'telefone_contato') return sanitizeTelefoneDisplay(row.telefone_contato);
    if (key === 'whatsapp') {
      const link = whatsAppLink(row.telefone_contato);
      if (!link) return '—';
      return (
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-green-600 text-white hover:bg-green-700"
          title="Abrir WhatsApp"
          aria-label="WhatsApp"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
        </a>
      );
    }
    return toUpper(row[key]);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-800">Agenda Forms</h1>
      <p className="text-slate-600 text-sm">
        Dados de visitas com situação da família (Liberado / Bloqueado / Cancelado). Use os filtros para cruzar por bairro, situação e outros campos.
      </p>

      <form onSubmit={handleApplyFilters} className="card p-4">
        <h2 className="font-medium text-slate-800 mb-3">Filtros (combine 2 a 5 campos)</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {AGENDA_FORMS_FILTERS.map((f) => (
            <div key={f.key}>
              <label htmlFor={f.key} className="label text-xs">
                {f.label}
              </label>
              <input
                id={f.key}
                type="text"
                value={filters[f.key] ?? ''}
                onChange={(e) => handleFilterChange(f.key, e.target.value)}
                placeholder={f.placeholder}
                className="input text-sm py-1.5"
              />
            </div>
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          <button type="submit" className="btn-primary text-sm">
            Aplicar filtros
          </button>
          <button
            type="button"
            onClick={() => setFilters({})}
            className="btn-secondary text-sm"
          >
            Limpar
          </button>
        </div>
      </form>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm">
          {error}
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between flex-wrap gap-3">
          <span className="font-medium text-slate-700">Resultados</span>
          <div className="flex items-center gap-3 flex-wrap">
            <label className="flex items-center gap-2 text-sm text-slate-600">
              Por página
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="input py-1.5 text-sm w-20"
              >
                {PAGE_SIZE_OPTIONS.map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </label>
            {rows.length > 0 && (
              <button
                type="button"
                onClick={handleExportCsv}
                className="btn-secondary text-sm inline-flex items-center gap-1.5"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Exportar CSV
              </button>
            )}
            <span className="text-sm text-slate-500">
              {total === 0 ? '0 registros' : `Mostrando ${from}–${to} de ${total}`}{loading ? ' — carregando…' : ''}
            </span>
          </div>
        </div>
        {total > 0 && totalPages > 1 && (
          <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between text-sm">
            <button
              type="button"
              onClick={() => goToPage(page - 1)}
              disabled={page <= 1 || loading}
              className="btn-secondary py-1.5 px-3 disabled:opacity-50"
            >
              Anterior
            </button>
            <span className="text-slate-600">
              Página {page} de {totalPages}
            </span>
            <button
              type="button"
              onClick={() => goToPage(page + 1)}
              disabled={page >= totalPages || loading}
              className="btn-secondary py-1.5 px-3 disabled:opacity-50"
            >
              Próxima
            </button>
          </div>
        )}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center text-slate-500">Carregando…</div>
          ) : rows.length === 0 ? (
            <div className="p-8 text-center text-slate-500">Nenhum registro. Ajuste os filtros ou aguarde a carga dos dados.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  {AGENDA_FORMS_COLUMNS.map(({ key, label }) => (
                    <th
                      key={key}
                      className="text-left px-3 py-2 font-medium text-slate-600 whitespace-nowrap"
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr
                    key={row.id != null ? String(row.id) : `row-${i}`}
                    className="border-b border-slate-100 hover:bg-slate-50"
                  >
                    {AGENDA_FORMS_COLUMNS.map(({ key }) => (
                      <td
                        key={key}
                        className="px-3 py-2 text-slate-700 max-w-[220px] truncate align-middle"
                        title={typeof getCellValue(row, key) === 'string' ? String(getCellValue(row, key)) : undefined}
                      >
                        {getCellValue(row, key)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
