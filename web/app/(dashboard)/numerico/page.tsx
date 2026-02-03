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
  bairros?: string[];
}

const PRAZO_OPCOES = [
  { value: '', label: 'Qualquer' },
  { value: 'ate_12', label: 'Até 12 meses' },
  { value: '12_24', label: 'De 12 a 24 meses' },
  { value: '24_48', label: 'De 24 a 48 meses' },
  { value: 'mais_48', label: 'Mais de 48 meses' },
] as const;

/** Filtros: dicionário = string[] (múltiplos códigos); cras/bairro = string. */
type FiltrosState = Record<string, string | string[]>;

function formatNum(n: number): string {
  return n.toLocaleString('pt-BR');
}

function buildParams(filtros: FiltrosState): URLSearchParams {
  const params = new URLSearchParams();
  Object.entries(filtros).forEach(([k, v]) => {
    if (Array.isArray(v)) {
      v.forEach((val) => { if (val) params.append(k, val); });
    } else if (v && String(v).trim()) {
      params.set(k, String(v).trim());
    }
  });
  return params;
}

function hasAnyFilter(filtros: FiltrosState): boolean {
  return Object.entries(filtros).some(([, v]) =>
    Array.isArray(v) ? v.length > 0 : Boolean(v && String(v).trim())
  );
}

export default function NumericoPage() {
  const [campos, setCampos] = useState<CampoDicionario[]>([]);
  const [crasOpcoes, setCrasOpcoes] = useState<{ nome: string; cod: string }[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [bairrosNaConsulta, setBairrosNaConsulta] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingCras, setLoadingCras] = useState(true);
  const [loadingStats, setLoadingStats] = useState(true);
  const [error, setError] = useState('');
  const [filtros, setFiltros] = useState<FiltrosState>({});
  const [bairroInput, setBairroInput] = useState('');

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

  const loadCras = useCallback(() => {
    setLoadingCras(true);
    fetch('/api/data/cras-opcoes')
      .then((r) => r.json())
      .then((data) => {
        if (data.opcoes) setCrasOpcoes(data.opcoes);
        else setCrasOpcoes([]);
      })
      .catch(() => setCrasOpcoes([]))
      .finally(() => setLoadingCras(false));
  }, []);

  const loadStats = useCallback(() => {
    setLoadingStats(true);
    const params = buildParams(filtros);
    fetch(`/api/data/dashboard-stats?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setStats(null);
          setBairrosNaConsulta([]);
        } else {
          setStats({
            totalFamilias: data.totalFamilias ?? 0,
            totalPessoas: data.totalPessoas ?? 0,
            filtros: data.filtros ?? 0,
          });
          setBairrosNaConsulta(data.bairros ?? []);
        }
      })
      .catch(() => {
        setStats(null);
        setBairrosNaConsulta([]);
      })
      .finally(() => setLoadingStats(false));
  }, [filtros]);

  useEffect(() => {
    loadDicionario();
    loadCras();
  }, [loadDicionario, loadCras]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const handleMultiChange = (nomeCampo: string, cod: string, checked: boolean) => {
    setFiltros((prev) => {
      const arr = (prev[nomeCampo] as string[] | undefined) ?? [];
      const next = Array.isArray(arr) ? [...arr] : [];
      if (checked) {
        if (!next.includes(cod)) next.push(cod);
      } else {
        const i = next.indexOf(cod);
        if (i >= 0) next.splice(i, 1);
      }
      const out = { ...prev };
      if (next.length) out[nomeCampo] = next;
      else delete out[nomeCampo];
      return out;
    });
  };

  const handleBairroInput = (value: string) => setBairroInput(value);

  const applyBairroFilter = () => {
    const v = bairroInput.trim();
    setFiltros((prev) => {
      const out = { ...prev };
      if (v) out.bairro = v;
      else delete out.bairro;
      return out;
    });
  };

  const clearFilters = () => {
    setFiltros({});
    setBairroInput('');
    setBairrosNaConsulta([]);
  };

  const selectedValues = (nomeCampo: string): string[] => {
    const v = filtros[nomeCampo];
    return Array.isArray(v) ? v : [];
  };

  const selectedCras = selectedValues('cras');
  const hasFilters = hasAnyFilter(filtros);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-800">Dashboard Numérico</h1>
        <p className="text-slate-600 text-sm mt-1">
          Vigilância Socioassistencial — totais de famílias e pessoas cruzados por código familiar. Selecione mais de uma opção nos filtros; CRAS e bairro por texto.
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm">
          {error}
        </div>
      )}

      <section className="card p-6">
        <h2 className="font-medium text-slate-800 mb-3">Filtros (dicionário — múltipla escolha)</h2>
        {loading ? (
          <p className="text-slate-500 text-sm">Carregando opções…</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {campos.map((c) => (
              <div key={c.nome_campo} className="border border-slate-200 rounded-lg p-3 bg-slate-50/50">
                <p className="label text-xs font-medium text-slate-700 mb-2">{c.label}</p>
                <div className="max-h-40 overflow-y-auto space-y-1.5">
                  {c.opcoes.map((o) => (
                    <label key={o.cod} className="flex items-center gap-2 cursor-pointer text-sm">
                      <input
                        type="checkbox"
                        checked={selectedValues(c.nome_campo).includes(o.cod)}
                        onChange={(e) => handleMultiChange(c.nome_campo, o.cod, e.target.checked)}
                        className="rounded border-slate-300"
                      />
                      <span className="text-slate-700">{o.descricao}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 pt-4 border-t border-slate-200 space-y-4">
          <div>
            <p className="label text-xs font-medium text-slate-700 mb-2">CRAS de referência (múltipla escolha)</p>
            {loadingCras ? (
              <p className="text-slate-500 text-sm">Carregando…</p>
            ) : (
              <div className="flex flex-wrap gap-3">
                {crasOpcoes.map((o) => (
                  <label key={o.cod} className="flex items-center gap-2 cursor-pointer text-sm">
                    <input
                      type="checkbox"
                      checked={selectedCras.includes(o.nome)}
                      onChange={(e) => handleMultiChange('cras', o.nome, e.target.checked)}
                      className="rounded border-slate-300"
                    />
                    <span className="text-slate-700">{o.nome}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
          <div>
            <label htmlFor="bairro" className="label text-xs">Bairro / Unidade territorial (busca parcial)</label>
            <input
              id="bairro"
              type="text"
              value={bairroInput}
              onChange={(e) => handleBairroInput(e.target.value)}
              onBlur={applyBairroFilter}
              onKeyDown={(e) => e.key === 'Enter' && applyBairroFilter()}
              placeholder="Digite (ex.: Dutr) e pressione Enter ou saia do campo para aplicar"
              className="input text-sm py-2 w-full"
            />
          </div>
          <div>
            <label htmlFor="prazo_atualizacao" className="label text-xs">Prazo de atualização cadastral (a partir de hoje)</label>
            <select
              id="prazo_atualizacao"
              value={(filtros.prazo_atualizacao as string) ?? ''}
              onChange={(e) => {
                const v = e.target.value;
                setFiltros((prev) => {
                  const out = { ...prev };
                  if (v) out.prazo_atualizacao = v;
                  else delete out.prazo_atualizacao;
                  return out;
                });
              }}
              className="input text-sm py-2 w-full"
            >
              {PRAZO_OPCOES.map((o) => (
                <option key={o.value || 'qualquer'} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>

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

      {bairrosNaConsulta.length > 0 && (
        <section className="card p-6">
          <h2 className="font-medium text-slate-800 mb-2">Bairros nesta consulta</h2>
          <p className="text-sm text-slate-600 mb-2">
            Bairros/unidades territoriais presentes no resultado filtrado ({bairrosNaConsulta.length}
            {bairrosNaConsulta.length >= 500 ? ' — exibindo até 500' : ''}):
          </p>
          <ul className="flex flex-wrap gap-2 text-sm text-slate-700">
            {bairrosNaConsulta.map((b) => (
              <li key={b} className="px-2 py-1 rounded bg-slate-100">{b}</li>
            ))}
          </ul>
        </section>
      )}

      {hasFilters && stats && (
        <p className="text-sm text-slate-500">
          Famílias e pessoas cruzadas por código familiar. Prazo de atualização calculado a partir de hoje.
        </p>
      )}
    </div>
  );
}
