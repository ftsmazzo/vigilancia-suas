'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import type { PontoCEP } from '@/components/MapaCEPs';

const MapaCEPs = dynamic(() => import('@/components/MapaCEPs'), {
  ssr: false,
  loading: () => (
    <div className="h-[600px] w-full rounded-lg border border-slate-200 bg-slate-100 flex items-center justify-center text-slate-500">
      Carregando mapa…
    </div>
  ),
});

export default function MapaPage() {
  const [pontos, setPontos] = useState<PontoCEP[]>([]);
  const [bairros, setBairros] = useState<string[]>([]);
  const [bairroSelecionado, setBairroSelecionado] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [loadingBairros, setLoadingBairros] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/data/ceps-mapa-bairros')
      .then((r) => r.json())
      .then((data) => {
        setBairros(data.bairros ?? []);
      })
      .catch(() => setBairros([]))
      .finally(() => setLoadingBairros(false));
  }, []);

  useEffect(() => {
    setLoading(true);
    const url = bairroSelecionado
      ? `/api/data/ceps-mapa?limite=3000&bairro=${encodeURIComponent(bairroSelecionado)}`
      : '/api/data/ceps-mapa?limite=3000';
    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        if (data.error && !data.pontos) {
          setError(data.error);
          setPontos([]);
        } else {
          setPontos(data.pontos ?? []);
          setError(data.error ?? null);
        }
      })
      .catch(() => {
        setError('Falha ao carregar pontos.');
        setPontos([]);
      })
      .finally(() => setLoading(false));
  }, [bairroSelecionado]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">Mapa por CEP</h1>
        <p className="text-sm text-slate-500 mt-1">
          Pontos da base tbl_ceps — um marcador por CEP. Filtre por bairro e clique no pin para ver endereço.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label htmlFor="mapa-bairro" className="text-sm font-medium text-slate-700">
          Bairro
        </label>
        <select
          id="mapa-bairro"
          value={bairroSelecionado}
          onChange={(e) => setBairroSelecionado(e.target.value)}
          disabled={loadingBairros}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 min-w-[200px]"
        >
          <option value="">Todos os bairros</option>
          {bairros.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
        {bairroSelecionado && (
          <span className="text-sm text-slate-500">
            Filtrando por: <strong>{bairroSelecionado}</strong>
          </span>
        )}
      </div>

      {error && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="h-[600px] w-full rounded-lg border border-slate-200 bg-slate-100 flex items-center justify-center text-slate-500">
          Carregando pontos…
        </div>
      ) : (
        <>
          <p className="text-sm text-slate-600">
            <strong>{pontos.length}</strong> CEP(s) no mapa.
          </p>
          <MapaCEPs pontos={pontos} />
        </>
      )}
    </div>
  );
}
