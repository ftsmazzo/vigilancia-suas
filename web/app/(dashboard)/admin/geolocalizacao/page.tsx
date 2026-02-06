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
  const [matchStats, setMatchStats] = useState<{
    total_mv_familias_geo: number | null;
    total_mv_familias_geo_por_logradouro: number | null;
    total_com_territorio: number | null;
    total_familias_cadastro: number | null;
    error?: string;
  } | null>(null);
  const [matchStatsLoading, setMatchStatsLoading] = useState(false);
  const [viaCepLoading, setViaCepLoading] = useState(false);
  const [viaCepMsg, setViaCepMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

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
      if (data.geo_stats) {
        setMatchStats({
          total_mv_familias_geo: data.geo_stats.total_mv_familias_geo,
          total_mv_familias_geo_por_logradouro: data.geo_stats.total_mv_familias_geo_por_logradouro,
          total_com_territorio: data.geo_stats.total_com_territorio,
          total_familias_cadastro: data.geo_stats.total_familias_cadastro,
        });
      } else {
        fetchMatchStats();
      }
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

  async function downloadSemTerritorio() {
    try {
      const res = await fetch('/api/data/geo-sem-territorio');
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setRefreshMsg({ type: 'err', text: data.error || 'Falha ao exportar.' });
        return;
      }
      const rows = data.rows as Array<{ cod_familiar: string; cep: string; endereco: string; bairro: string }>;
      const header = 'cod_familiar;cep;endereco;bairro\n';
      const body = rows.map((r) => [r.cod_familiar ?? '', r.cep ?? '', (r.endereco ?? '').replace(/"/g, '""'), r.bairro ?? ''].map((c) => `"${c}"`).join(';')).join('\n');
      const csv = '\uFEFF' + header + body; // BOM para Excel
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `familias_sem_territorio_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setRefreshMsg({ type: 'err', text: 'Erro ao gerar CSV.' });
    }
  }

  async function fetchMatchStats() {
    setMatchStatsLoading(true);
    setMatchStats(null);
    try {
      const res = await fetch('/api/data/geo-match-stats');
      const data = await res.json().catch(() => ({}));
      setMatchStats({
        total_mv_familias_geo: data.total_mv_familias_geo ?? null,
        total_mv_familias_geo_por_logradouro: data.total_mv_familias_geo_por_logradouro ?? null,
        total_com_territorio: data.total_com_territorio ?? null,
        total_familias_cadastro: data.total_familias_cadastro ?? null,
        error: data.error ?? undefined,
      });
    } catch {
      setMatchStats({ total_mv_familias_geo: null, total_mv_familias_geo_por_logradouro: null, total_com_territorio: null, total_familias_cadastro: null, error: 'Erro ao carregar.' });
    } finally {
      setMatchStatsLoading(false);
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

  async function runViaCepEnrich() {
    setViaCepMsg(null);
    setViaCepLoading(true);
    try {
      const res = await fetch('/api/admin/geo/via-cep-enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: 200 }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setViaCepMsg({ type: 'err', text: data.error || 'Falha no enriquecimento.' });
        return;
      }
      setViaCepMsg({ type: 'ok', text: data.message || 'Via CEP executado.' });
      if (data.inserted_geo > 0) fetchMatchStats();
    } catch {
      setViaCepMsg({ type: 'err', text: 'Erro de conexão.' });
    } finally {
      setViaCepLoading(false);
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

      {(uploadMsg || refreshMsg || createMvMsg || viaCepMsg) && (
        <div
          className={`rounded-lg px-4 py-3 text-sm ${
            (uploadMsg ?? refreshMsg ?? createMvMsg ?? viaCepMsg)?.type === 'ok' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          {(uploadMsg ?? refreshMsg ?? createMvMsg ?? viaCepMsg)?.text}
        </div>
      )}

      <section className="card p-6">
        <h2 className="font-medium text-slate-800 mb-2">Resultado do match Geo</h2>
        <p className="text-sm text-slate-500 mb-4">
          Contagens reais das materialized views após &quot;Atualizar match Geo&quot;. São esses números que o sistema usa (vw_familias_territorio). A <strong>Análise 24m</strong> abaixo é só diagnóstico (recalcula na hora e não usa as MVs).
        </p>
        <button
          type="button"
          onClick={fetchMatchStats}
          disabled={matchStatsLoading}
          className="btn-primary disabled:opacity-50 mb-4"
        >
          {matchStatsLoading ? 'Carregando…' : 'Ver resultado do match'}
        </button>
        {matchStats?.error && (
          <p className="text-sm text-amber-700 mb-2">{matchStats.error}</p>
        )}
        {matchStats && !matchStats.error && (
          <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-4 text-sm">
            <ul className="space-y-1 text-slate-600">
              <li><strong>Total famílias no cadastro:</strong> {matchStats.total_familias_cadastro != null ? matchStats.total_familias_cadastro.toLocaleString('pt-BR') : '—'}</li>
              <li><strong>Match CEP + logradouro (mv_familias_geo):</strong> {matchStats.total_mv_familias_geo != null ? matchStats.total_mv_familias_geo.toLocaleString('pt-BR') : '—'}</li>
              <li><strong>Match só logradouro (candidatos):</strong> {matchStats.total_mv_familias_geo_por_logradouro != null ? matchStats.total_mv_familias_geo_por_logradouro.toLocaleString('pt-BR') : '—'}</li>
              <li><strong>Total com território (usado no sistema):</strong> <span className="font-medium text-slate-800">{matchStats.total_com_territorio != null ? matchStats.total_com_territorio.toLocaleString('pt-BR') : '—'}</span></li>
            </ul>
            <p className="text-xs text-slate-500 mt-3 pt-3 border-t border-slate-200">
              O match é <strong>exato</strong> após normalização (maiúsculas, sem acento, abreviações como R. → RUA). <strong>Erros de grafia</strong> (ex.: Braisl vs Brasil) impedem match; padronize na base Geo ou no cadastro para melhorar.
            </p>
            {matchStats.total_familias_cadastro != null && matchStats.total_com_territorio != null && matchStats.total_familias_cadastro > matchStats.total_com_territorio && (
              <div className="mt-4 pt-4 border-t border-slate-200">
                <p className="font-medium text-slate-700 mb-2">O que fazer com os endereços sem território</p>
                <p className="text-sm text-slate-600 mb-3">
                  <strong>{(matchStats.total_familias_cadastro - matchStats.total_com_territorio).toLocaleString('pt-BR')} famílias</strong> não deram match (CEP ou endereço não batem com a base Geo). Você pode:
                </p>
                <ol className="list-decimal list-inside text-sm text-slate-600 space-y-1 mb-3">
                  <li><strong>Corrigir na origem:</strong> no sistema de onde sai o CADU, ajustar CEP ou endereço (grafia, abreviação). Na próxima carga + &quot;Atualizar match Geo&quot;, entram no território.</li>
                  <li><strong>Enriquecer a Geo:</strong> incluir na <code className="text-xs">tbl_geo</code> os endereços que faltam (CSV no mesmo formato, ou Via CEP no futuro). Depois &quot;Atualizar match Geo&quot;.</li>
                  <li><strong>Revisar a lista:</strong> baixe o CSV abaixo, abra no Excel, identifique erros de digitação e corrija na origem ou adicione linhas na base Geo.</li>
                </ol>
                <button
                  type="button"
                  onClick={downloadSemTerritorio}
                  disabled={matchStatsLoading}
                  className="btn-primary text-sm disabled:opacity-50"
                >
                  Exportar lista sem território (CSV)
                </button>
              </div>
            )}
          </div>
        )}
      </section>

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
          <strong>Antes:</strong> na <Link href="/admin" className="text-primary-600 hover:underline">Manutenção</Link>, execute &quot;1. Views CADU&quot; e &quot;2. mv_familias_limpa&quot;. Use este botão quando a materialized view ainda não existir ou quando quiser recriá-la do zero. Pode demorar <strong>até 2 horas</strong> em base grande — não feche a página. Se der timeout mesmo assim, rode no PGAdmin (ou psql): <strong>create_geo_match_step1.sql</strong>, aguarde terminar, depois <strong>create_geo_match_step2.sql</strong>. Ver GUIA_GEO.md.
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

      <section className="card p-6">
        <h2 className="font-medium text-slate-800 mb-2">Incluir na Geo os CEPs que o CADU tem e a Geo não tem</h2>
        <p className="text-sm text-slate-500 mb-4">
          Lista os <strong>CEPs distintos do CADU que ainda não estão na tbl_geo</strong>, consulta Via CEP (linha a linha, ~1 req/s) e insere o resultado na Geo. Lat/long, CRAS e CREAS ficam em branco (Via CEP não retorna; você pode preencher depois). Pode rodar várias vezes: a cada vez processa até 200 CEPs que ainda faltam. Depois rode &quot;Atualizar match Geo&quot; para o match usar a Geo atualizada.
        </p>
        <button
          type="button"
          onClick={runViaCepEnrich}
          disabled={viaCepLoading}
          className="btn-primary disabled:opacity-50"
        >
          {viaCepLoading ? 'Enriquecendo… (pode levar alguns minutos)' : 'Via CEP: incluir CEPs do CADU na Geo (até 200)'}
        </button>
      </section>

      <section className="card p-6">
        <h2 className="font-medium text-slate-800 mb-2">Match por similaridade (ortografia)</h2>
        <p className="text-sm text-slate-500 mb-4">
          Para tolerar <strong>erros de grafia</strong> (ex.: Braisl vs Brasil), rode uma vez no PGAdmin o script <strong>create_geo_match_fuzzy.sql</strong>. Ele cria a extensão <code className="text-xs">pg_trgm</code> e a MV <code className="text-xs">mv_familias_geo_fuzzy</code> (match por similaridade de texto). A view <code className="text-xs">vw_familias_territorio</code> passa a usar três níveis: exato, só logradouro e fuzzy. Depois disso, &quot;Atualizar match Geo&quot; também atualiza a MV fuzzy. Se o servidor não permitir <code className="text-xs">CREATE EXTENSION</code>, peça ao DBA para instalar <code className="text-xs">pg_trgm</code>.
        </p>
      </section>
    </div>
  );
}
