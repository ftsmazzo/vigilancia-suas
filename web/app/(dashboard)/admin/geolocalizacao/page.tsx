'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function GeolocalizacaoPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ role: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [refreshLoading, setRefreshLoading] = useState(false);
  const [refreshMsg, setRefreshMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [createMvLoading, setCreateMvLoading] = useState(false);
  const [createMvMsg, setCreateMvMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((data) => {
        setUser(data.user ?? null);
        if (data.user && data.user.role !== 'admin') {
          router.replace('/');
        }
      })
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setUploadMsg({ type: 'err', text: 'Selecione um arquivo.' });
      return;
    }
    setUploadMsg(null);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.set('file', file);
      const res = await fetch('/api/admin/upload/geo', { method: 'POST', body: formData });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setUploadMsg({ type: 'err', text: data.error || 'Falha no upload.' });
        return;
      }
      setUploadMsg({ type: 'ok', text: data.message + (data.hint ? ` ${data.hint}` : '') });
      setFile(null);
    } catch {
      setUploadMsg({ type: 'err', text: 'Erro de conexão.' });
    } finally {
      setUploading(false);
    }
  }

  async function runRefreshGeo() {
    setRefreshMsg(null);
    setRefreshLoading(true);
    try {
      const res = await fetch('/api/admin/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'geo' }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setRefreshMsg({ type: 'err', text: data.error || 'Falha ao atualizar.' });
        return;
      }
      setRefreshMsg({ type: 'ok', text: data.message || 'Match Geo atualizado.' });
    } catch {
      setRefreshMsg({ type: 'err', text: 'Erro de conexão.' });
    } finally {
      setRefreshLoading(false);
    }
  }

  async function runCreateMv() {
    setCreateMvMsg(null);
    setCreateMvLoading(true);
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 1800000);
      const res = await fetch('/api/admin/geo/create-mv', {
        method: 'POST',
        signal: controller.signal,
      });
      clearTimeout(timeout);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setCreateMvMsg({ type: 'err', text: data.error || 'Falha ao criar mv_familias_geo.' });
        return;
      }
      setCreateMvMsg({ type: 'ok', text: data.message || 'mv_familias_geo criada com sucesso.' });
    } catch (e) {
      const msg =
        e instanceof Error && e.name === 'AbortError'
          ? 'Tempo esgotado (30 min). Verifique no Postgres se mv_familias_geo já foi criada — o servidor pode ter terminado depois. Se existir, use "Atualizar match Geo". Senão, tente de novo ou use psql (GUIA_GEO.md).'
          : 'Erro de conexão.';
      setCreateMvMsg({ type: 'err', text: msg });
    } finally {
      setCreateMvLoading(false);
    }
  }

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center min-h-[200px] text-slate-500">
        Carregando…
      </div>
    );
  }

  if (user.role !== 'admin') {
    return null;
  }

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <Link href="/admin" className="text-sm text-slate-500 hover:text-slate-700 mb-2 inline-block">
          ← Manutenção
        </Link>
        <h1 className="text-2xl font-semibold text-slate-800">Geolocalização</h1>
        <p className="text-slate-600 text-sm mt-1">
          Base de endereços e CEP do município para cruzar com o CADU (territorialidade, CRAS, lat/long).
          Tudo relacionado a georreferenciamento fica nesta página; próximas etapas (variantes de logradouro, Via CEP) serão adicionadas aqui.
        </p>
      </div>

      {(uploadMsg || refreshMsg || createMvMsg) && (
        <div
          className={`rounded-lg px-4 py-3 text-sm ${
            (uploadMsg ?? refreshMsg ?? createMvMsg)?.type === 'ok' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          {(uploadMsg ?? refreshMsg ?? createMvMsg)?.text}
        </div>
      )}

      <section className="card p-6">
        <h2 className="font-medium text-slate-800 mb-2">Criar ou recriar mv_familias_geo</h2>
        <p className="text-sm text-slate-500 mb-4">
          Use este botão quando a materialized view ainda não existir ou quando quiser recriá-la do zero. Pode demorar vários minutos (até 30 min) — não feche a página. Se aparecer &quot;Tempo esgotado&quot;, confira no Postgres se a MV já existe (o servidor pode ter terminado depois).
        </p>
        <button
          type="button"
          onClick={runCreateMv}
          disabled={createMvLoading}
          className="btn-primary disabled:opacity-50"
        >
          {createMvLoading ? 'Criando… (aguarde)' : 'Criar/recriar mv_familias_geo'}
        </button>
      </section>

      <section className="card p-6">
        <h2 className="font-medium text-slate-800 mb-2">Atualizar match Geo (mv_familias_geo)</h2>
        <p className="text-sm text-slate-500 mb-4">
          Geo é a fonte da verdade (1) — famílias (N). O match CEP + logradouro normalizado fica na <strong>materialized view mv_familias_geo</strong>. Execute este refresh após atualizar tbl_geo (upload) ou cadu_raw (upload CADU) para repopular os dados de território.
        </p>
        <button
          type="button"
          onClick={runRefreshGeo}
          disabled={refreshLoading}
          className="btn-primary disabled:opacity-50"
        >
          {refreshLoading ? 'Atualizando…' : 'Atualizar match Geo'}
        </button>
      </section>

      <section className="card p-6">
        <h2 className="font-medium text-slate-800 mb-2">Fase 1 — Base Geo (tbl_geo)</h2>
        <p className="text-sm text-slate-500 mb-4">
          Carregue o CSV da base de endereços/CEP do município. Execute <strong>create_tbl_geo.sql</strong> no banco (PGAdmin) uma vez antes do primeiro upload. Depois do upload, use &quot;Atualizar match Geo&quot; acima.
        </p>
        <form onSubmit={handleSubmit} className="p-4 rounded-lg border border-slate-200 bg-slate-50/50">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[200px]">
              <label className="label text-xs">Geo (endereços/CEP município)</label>
              <input
                type="file"
                accept=".csv"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="input text-sm py-1.5"
              />
              <p className="text-xs text-slate-500 mt-0.5">
                CSV com vírgula: endereco, bairro, cep, id_endereco, id_cidade, id_bairro, lat_char, long_char, lat_num, long_num, cras, creas
              </p>
            </div>
            <button type="submit" disabled={uploading} className="btn-primary text-sm disabled:opacity-50">
              {uploading ? 'Enviando…' : 'Enviar'}
            </button>
          </div>
        </form>
      </section>

      <section className="card p-6 border-slate-200 opacity-90">
        <h2 className="font-medium text-slate-700 mb-2">Fase 2 — Dicionário de variantes (em breve)</h2>
        <p className="text-sm text-slate-500">
          Tabela de variantes de logradouro (CADU → canônico) para melhorar o match quando a mesma rua está escrita de várias formas. Ver GEO_ESTRATEGIA_SANITIZACAO.md.
        </p>
      </section>

      <section className="card p-6 border-slate-200 opacity-90">
        <h2 className="font-medium text-slate-700 mb-2">Fase 3 — Via CEP em lote (em breve)</h2>
        <p className="text-sm text-slate-500">
          Cache e validação CEP↔endereço com Via CEP para corrigir CEP central e CEPs novos. Ver GEO_ESTRATEGIA_SANITIZACAO.md.
        </p>
      </section>
    </div>
  );
}
