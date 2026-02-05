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
  const [analiseLoading, setAnaliseLoading] = useState(false);
  const [analise, setAnalise] = useState<{
    total_familias_cadastro: number;
    total_familias_24m: number;
    com_cep_preenchido_24m: number;
    cep_existe_na_geo_24m: number;
    endereco_coincide_24m: number;
    endereco_divergente_24m: number;
  } | null>(null);
  const [analiseErr, setAnaliseErr] = useState<string | null>(null);

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

  const GEO_REQUEST_MS = 7200000; // 2h — refresh/criar MVs pode levar muito em base grande

  async function runRefreshGeo() {
    setRefreshMsg(null);
    setRefreshLoading(true);
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), GEO_REQUEST_MS);
      const res = await fetch('/api/admin/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'geo' }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setRefreshMsg({ type: 'err', text: data.error || 'Falha ao atualizar.' });
        return;
      }
      setRefreshMsg({ type: 'ok', text: data.message || 'Match Geo atualizado.' });
    } catch (e) {
      const msg =
        e instanceof Error && e.name === 'AbortError'
          ? 'Tempo esgotado (2 h). Tente novamente ou rode o refresh no PGAdmin (GUIA_GEO.md).'
          : 'Erro de conexão.';
      setRefreshMsg({ type: 'err', text: msg });
    } finally {
      setRefreshLoading(false);
    }
  }

  async function runAnaliseCepLogradouro() {
    setAnaliseErr(null);
    setAnalise(null);
    setAnaliseLoading(true);
    try {
      const res = await fetch('/api/data/analise-cep-logradouro-24m');
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setAnaliseErr(data.error || 'Falha ao calcular.');
        return;
      }
      setAnalise(data);
    } catch {
      setAnaliseErr('Erro de conexão.');
    } finally {
      setAnaliseLoading(false);
    }
  }

  async function runCreateMv() {
    setCreateMvMsg(null);
    setCreateMvLoading(true);
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), GEO_REQUEST_MS);
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
          ? 'Tempo esgotado (2 h). Verifique no Postgres se as MVs já existem — o servidor pode ter terminado depois. Se existirem, use "Atualizar match Geo". Senão, rode create_geo_match_step1.sql e step2 no PGAdmin/psql (GUIA_GEO.md).'
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
        <h2 className="font-medium text-slate-800 mb-2">Análise CEP × logradouro (últimos 24 meses)</h2>
        <p className="text-sm text-slate-500 mb-4">
          Confronta o join por CEP com a Geo e verifica se o endereço (logradouro) do CADU coincide com o da Geo. Considera apenas cadastros com <strong>data de atualização até 24 meses</strong>. Assim você vê o volume de famílias com CEP que existe na Geo mas endereço divergente (ex.: CEP genérico).
        </p>
        <button
          type="button"
          onClick={runAnaliseCepLogradouro}
          disabled={analiseLoading}
          className="btn-primary disabled:opacity-50 mb-4"
        >
          {analiseLoading ? 'Calculando…' : 'Calcular análise'}
        </button>
        {analiseErr && (
          <p className="text-sm text-red-600 mb-2">{analiseErr}</p>
        )}
        {analise && (
          <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-4 text-sm space-y-4">
            <div>
              <p className="font-medium text-slate-700 mb-2">Resultado</p>
              <ul className="space-y-1 text-slate-600">
                <li><strong>Total de famílias no cadastro (vw_familias_limpa):</strong> {analise.total_familias_cadastro.toLocaleString('pt-BR')}</li>
                <li><strong>Com atualização nos últimos 24 meses:</strong> {analise.total_familias_24m.toLocaleString('pt-BR')}</li>
                <li><strong>Com CEP preenchido (24m):</strong> {analise.com_cep_preenchido_24m.toLocaleString('pt-BR')}</li>
                <li><strong>CEP existe na Geo (join por CEP):</strong> {analise.cep_existe_na_geo_24m.toLocaleString('pt-BR')}</li>
                <li><strong>Endereço coincide (CADU = Geo):</strong> {analise.endereco_coincide_24m.toLocaleString('pt-BR')}</li>
                <li><strong>Endereço divergente (erro / CEP genérico):</strong> <span className="text-amber-700 font-medium">{analise.endereco_divergente_24m.toLocaleString('pt-BR')}</span></li>
              </ul>
            </div>
            <div className="pt-3 border-t border-slate-200">
              <p className="text-slate-600 mb-2">
                A correção (match por logradouro) atua nos <strong>candidatos</strong>: CEP na Geo mas sem match CEP+logradouro (em toda a base, não só 24m). Atualize as MVs para aplicar.
              </p>
              <button
                type="button"
                onClick={runRefreshGeo}
                disabled={refreshLoading}
                className="btn-primary disabled:opacity-50"
              >
                {refreshLoading ? 'Atualizando… (pode levar 5–15 min)' : 'Atualizar match Geo'}
              </button>
              <p className="text-xs text-slate-500 mt-2">A primeira MV (base toda) demora mais; a segunda (só candidatos) é rápida.</p>
            </div>
          </div>
        )}
      </section>

      <section className="card p-6">
        <h2 className="font-medium text-slate-800 mb-2">Criar ou recriar mv_familias_geo</h2>
        <p className="text-sm text-slate-500 mb-4">
          Use este botão quando a materialized view ainda não existir ou quando quiser recriá-la do zero. Pode demorar <strong>até 2 horas</strong> em base grande — não feche a página. Se der timeout mesmo assim, rode no PGAdmin (ou psql): <strong>create_geo_match_step1.sql</strong>, aguarde terminar, depois <strong>create_geo_match_step2.sql</strong>. Ver GUIA_GEO.md.
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
        <h2 className="font-medium text-slate-800 mb-2">Atualizar match Geo</h2>
        <p className="text-sm text-slate-500 mb-4">
          Atualiza <strong>mv_familias_geo</strong> (base toda; pode levar <strong>até 2 h</strong> em base grande) e <strong>mv_familias_geo_por_logradouro</strong> (só candidatos — rápido). O mesmo botão aparece acima, dentro do resultado da análise. Se der timeout, rode no PGAdmin: <code className="text-xs">REFRESH MATERIALIZED VIEW mv_familias_geo;</code> e <code className="text-xs">REFRESH MATERIALIZED VIEW mv_familias_geo_por_logradouro;</code>
        </p>
        <button
          type="button"
          onClick={runRefreshGeo}
          disabled={refreshLoading}
          className="btn-primary disabled:opacity-50"
        >
          {refreshLoading ? 'Atualizando… (5–15 min)' : 'Atualizar match Geo'}
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

      <section className="card p-6">
        <h2 className="font-medium text-slate-800 mb-2">Cruzamento e territorialização</h2>
        <p className="text-sm text-slate-500 mb-2">
          O sistema usa <strong>vw_familias_territorio</strong>: <strong>todas</strong> as famílias do CADU. Território (CEP/endereço/bairro/CRAS/CREAS/lat/long) vem da Geo em dois passos: (1) match <strong>CEP + logradouro</strong> (<code>mv_familias_geo</code>); (2) se não houver, match <strong>só por logradouro</strong> nos <strong>candidatos</strong> (CEP na Geo mas sem match CEP+logradouro, ~5k famílias) — assim o tempo de processamento cai e o CEP da Geo corrige CEP genérico sem alterar cadastro e sem Via CEP.
        </p>
        <p className="text-sm text-slate-500 mb-2">
          Dashboard, bairro, CRAS e consultas usam <strong>vw_familias_territorio</strong>. Não é preciso fazer JOIN.
        </p>
        <p className="text-sm text-slate-500">
          Após upload de Geo ou CADU, use &quot;Atualizar match Geo&quot; para repopular as duas MVs; a view reflete os dados atualizados.
        </p>
      </section>

      <section className="card p-6 border-slate-200 opacity-90">
        <h2 className="font-medium text-slate-700 mb-2">Via CEP — enriquecer a Geo (em breve)</h2>
        <p className="text-sm text-slate-500">
          Objetivo: incluir na <strong>tbl_geo</strong> endereços que existem no CADU e ainda não estão na Geo (locais novos, base Geo de 2023). Via CEP em lote para buscar dados e INSERT na Geo; depois refresh da mv_familias_geo agrega mais famílias.
        </p>
      </section>
    </div>
  );
}
