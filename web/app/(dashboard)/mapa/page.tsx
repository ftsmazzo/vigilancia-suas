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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/data/ceps-mapa?limite=3000')
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
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">Mapa por CEP</h1>
        <p className="text-sm text-slate-500 mt-1">
          Pontos da base de endereços (tbl_geo) — um marcador por CEP. Clique no pin para ver endereço e bairro.
        </p>
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
