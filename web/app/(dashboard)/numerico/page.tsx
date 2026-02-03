'use client';

import { useCallback, useEffect, useState } from 'react';

interface Opcao {
  cod: string;
  descricao: string;
}

interface CampoDicionario {
  nome_campo: string;
  label: string;
  opcoes: Opcao[];
}

interface Stats {
  totalFamilias: number;
  totalPessoas: number;
  filtros: number;
}

function formatNum(n: number): string {
  return n.toLocaleString('pt-BR');
}

export default function NumericoPage() {
  const [campos, setCampos] = useState<CampoDicionario[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingStats, setLoadingStats] = useState(true);
  const [error, setError] = useState('');
  const [filtros, setFiltros] = useState<Record<string, string>>({});

  const loadDicionario = useCallback(() => {
    setLoading(true);
    setError('');
    fetch('/api/data/dicionario-dashboard')
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
          setCampos([]);
        } else {
          setCampos(data.campos ?? []);
        }
      })
      .catch(() => {
        setError('Erro ao carregar filtros.');
        setCampos([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const loadStats = useCallback(() => {
    setLoadingStats(true);
    const params = new URLSearchParams();
    Object.entries(filtros).forEach(([k, v]) => {
      if (v) params.set(k, v);
    });
    fetch(`/api/data/dashboard-stats?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setStats(null);
        } else {
          setStats({
            totalFamilias: data.totalFamilias ?? 0,
            totalPessoas: data.totalPessoas ?? 0,
            filtros: data.filtros ?? 0,
          });
        }
      })
      .catch(() => setStats(null))
      .finally(() => setLoadingStats(false));
  }, [filtros]);

  useEffect(() => {
    loadDicionario();
  }, [loadDicionario]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const handleFilterChange = (nomeCampo: string, value: string) => {
    setFiltros((prev) => {
      const next = { ...prev };
      if (value) next[nomeCampo] = value;
      else delete next[nomeCampo];
      return next;
    });
  };

  const clearFilters = () => {
    setFiltros({});
  };

  const hasFilters = Object.keys(filtros).some((k) => filtros[k]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-800">Dashboard Numérico</h1>
        <p className="text-slate-600 text-sm mt-1">
          Vigilância Socioassistencial — totais de famílias e pessoas a partir do CADU. Use os filtros para refinar os números.
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm">
          {error}
        </div>
      )}

      <section className="card p-6">
        <h2 className="font-medium text-slate-800 mb-3">Filtros (dicionário)</h2>
        {loading ? (
          <p className="text-slate-500 text-sm">Carregando opções…</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {campos.map((c) => (
              <div key={c.nome_campo}>
                <label htmlFor={c.nome_campo} className="label text-xs">
                  {c.label}
                </label>
                <select
                  id={c.nome_campo}
                  value={filtros[c.nome_campo] ?? ''}
                  onChange={(e) => handleFilterChange(c.nome_campo, e.target.value)}
                  className="input text-sm py-2 w-full"
                >
                  <option value="">Todos</option>
                  {c.opcoes.map((o) => (
                    <option key={o.cod} value={o.cod}>
                      {o.descricao}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        )}
        {hasFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="mt-3 btn-secondary text-sm"
          >
            Limpar filtros
          </button>
        )}
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="card p-6 border-primary-100 bg-primary-50/30">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary-100 text-primary-700">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-600">Famílias cadastradas</p>
              <p className="text-2xl font-bold text-slate-800 tabular-nums">
                {loadingStats ? '…' : stats ? formatNum(stats.totalFamilias) : '—'}
              </p>
            </div>
          </div>
        </div>
        <div className="card p-6 border-primary-100 bg-primary-50/30">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary-100 text-primary-700">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-600">Pessoas cadastradas</p>
              <p className="text-2xl font-bold text-slate-800 tabular-nums">
                {loadingStats ? '…' : stats ? formatNum(stats.totalPessoas) : '—'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {hasFilters && stats && (
        <p className="text-sm text-slate-500">
          Números com {stats.filtros} filtro(s) aplicado(s). Altere os filtros acima para atualizar os totais.
        </p>
      )}
    </div>
  );
}
