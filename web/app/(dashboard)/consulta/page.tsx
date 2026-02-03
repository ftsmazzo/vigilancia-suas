'use client';

import { useEffect, useState } from 'react';

interface ViewItem {
  name: string;
  type: string;
}

export default function ConsultaPage() {
  const [views, setViews] = useState<ViewItem[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/data/views')
      .then((r) => r.json())
      .then((data) => {
        if (data.views) setViews(data.views);
      })
      .catch(() => setError('Erro ao carregar lista de views.'));
  }, []);

  useEffect(() => {
    if (!selected) {
      setRows([]);
      setTotal(0);
      return;
    }
    setLoading(true);
    setError('');
    fetch(`/api/data/query?table=${encodeURIComponent(selected)}&limit=100&offset=0`)
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
      .catch(() => setError('Erro ao carregar dados.'))
      .finally(() => setLoading(false));
  }, [selected]);

  const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-800">Consulta</h1>
      <p className="text-slate-600 text-sm">
        Selecione uma view ou tabela para visualizar os dados (até 100 linhas).
      </p>

      <div className="card p-4">
        <label htmlFor="view" className="label mb-2">View / Tabela</label>
        <select
          id="view"
          value={selected ?? ''}
          onChange={(e) => setSelected(e.target.value || null)}
          className="input max-w-md"
        >
          <option value="">— Selecione —</option>
          {views.map((v) => (
            <option key={v.name} value={v.name}>
              {v.name} ({v.type === 'VIEW' ? 'view' : 'tabela'})
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {selected && (
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
            <span className="font-medium text-slate-700">{selected}</span>
            <span className="text-sm text-slate-500">
              {total} registro(s){loading ? ' — carregando…' : ''}
            </span>
          </div>
          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-8 text-center text-slate-500">Carregando…</div>
            ) : rows.length === 0 ? (
              <div className="p-8 text-center text-slate-500">Nenhum registro.</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    {columns.map((col) => (
                      <th
                        key={col}
                        className="text-left px-3 py-2 font-medium text-slate-600 whitespace-nowrap"
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr
                      key={i}
                      className="border-b border-slate-100 hover:bg-slate-50"
                    >
                      {columns.map((col) => (
                        <td
                          key={col}
                          className="px-3 py-2 text-slate-700 max-w-[200px] truncate"
                          title={String(row[col] ?? '')}
                        >
                          {row[col] != null ? String(row[col]) : '—'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
