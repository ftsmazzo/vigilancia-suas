'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

function UploadForm({
  type,
  label,
  accept,
  hint,
}: {
  type: string;
  label: string;
  accept: string;
  hint: string;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
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
      const res = await fetch(`/api/admin/upload/${type}`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setUploadMsg({ type: 'err', text: data.error || 'Falha no upload.' });
        return;
      }
      setUploadMsg({
        type: 'ok',
        text: data.message + (data.hint ? ` ${data.hint}` : ''),
      });
      setFile(null);
    } catch {
      setUploadMsg({ type: 'err', text: 'Erro de conexão.' });
    } finally {
      setUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mb-4 p-4 rounded-lg border border-slate-200 bg-slate-50/50">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[200px]">
          <label className="label text-xs">{label}</label>
          <input
            type="file"
            accept={accept}
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="input text-sm py-1.5"
          />
          <p className="text-xs text-slate-500 mt-0.5">{hint}</p>
        </div>
        <button type="submit" disabled={uploading} className="btn-primary text-sm disabled:opacity-50">
          {uploading ? 'Enviando…' : 'Enviar'}
        </button>
      </div>
      {uploadMsg && (
        <p className={`mt-2 text-sm ${uploadMsg.type === 'ok' ? 'text-green-700' : 'text-red-600'}`}>
          {uploadMsg.text}
        </p>
      )}
    </form>
  );
}

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ role: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshLoading, setRefreshLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

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

  async function runRefresh(action: string) {
    setRefreshLoading(action);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ type: 'err', text: data.error || 'Falha ao executar.' });
        return;
      }
      setMessage({ type: 'ok', text: data.message || 'Concluído.' });
    } catch {
      setMessage({ type: 'err', text: 'Erro de conexão.' });
    } finally {
      setRefreshLoading(null);
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
      <h1 className="text-2xl font-semibold text-slate-800">Manutenção</h1>
      <p className="text-slate-600 text-sm">
        Faça upload de CADU, Bloqueados, Cancelados e Folha de Pagamento; depois use &quot;Atualizar todas as views&quot; para repopular as materialized views. Visitas continua via Google Sheets com gatilho de agenda.
      </p>

      {message && (
        <div
          className={`rounded-lg px-4 py-3 text-sm ${
            message.type === 'ok' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          {message.text}
        </div>
      )}

      <section className="card p-6">
        <h2 className="font-medium text-slate-800 mb-2">Atualizar views materializadas</h2>
        <p className="text-sm text-slate-500 mb-4">
          Execute após carregar Folha, Bloqueados, Cancelados, CADU ou Visitas. Assim as views ficam alinhadas com os dados.
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => runRefresh('todas')}
            disabled={!!refreshLoading}
            className="btn-primary disabled:opacity-50 font-medium"
          >
            {refreshLoading === 'todas' ? 'Executando…' : 'Atualizar todas as views'}
          </button>
          <button
            type="button"
            onClick={() => runRefresh('familia_cpf_visitas')}
            disabled={!!refreshLoading}
            className="btn-secondary disabled:opacity-50"
          >
            {refreshLoading === 'familia_cpf_visitas' ? 'Executando…' : 'Só Família/CPF/Visitas'}
          </button>
          <button
            type="button"
            onClick={() => runRefresh('folha_rf')}
            disabled={!!refreshLoading}
            className="btn-secondary disabled:opacity-50"
          >
            {refreshLoading === 'folha_rf' ? 'Executando…' : 'Só Folha RF'}
          </button>
          <button
            type="button"
            onClick={() => runRefresh('geo')}
            disabled={!!refreshLoading}
            className="btn-secondary disabled:opacity-50"
          >
            {refreshLoading === 'geo' ? 'Executando…' : 'Só match Geo'}
          </button>
        </div>
        <p className="mt-3 text-xs text-slate-400">
          &quot;Atualizar todas as views&quot; roda em sequência: mv_familia_situacao, mv_cpf_familia_situacao, 5 MVs da Folha RF e mv_familias_geo. Ver ESTRUTURA_BANCO_VIEWS.md no repositório.
        </p>
      </section>

      <section className="card p-6">
        <h2 className="font-medium text-slate-800 mb-2">Upload de extrações</h2>
        <p className="text-sm text-slate-500 mb-3">
          Carregue os CSVs no banco. <strong>Depois de cada upload</strong>, clique em &quot;Atualizar todas as views&quot; acima para repopular as consultas (Agenda Forms, etc.). Visitas continua no Google Sheets com gatilho de agenda no N8N.
        </p>
        <UploadForm type="cadu" label="CADU" accept=".csv" hint="CSV com ; (ponto e vírgula), cabeçalho d. / p." />
        <UploadForm type="sibec-bloqueados" label="SIBEC Bloqueados" accept=".csv" hint="CSV com vírgula" />
        <UploadForm type="sibec-cancelados" label="SIBEC Cancelados" accept=".csv" hint="CSV com vírgula" />
        <UploadForm type="sibec-folha" label="SIBEC Folha de Pagamento" accept=".csv" hint="CSV com vírgula" />
        <p className="text-sm text-slate-500 mt-2">
          <strong>Geolocalização</strong> (base Geo, variantes, Via CEP) está em página separada:{' '}
          <Link href="/admin/geolocalizacao" className="text-primary-600 hover:underline">
            Geolocalização
          </Link>
        </p>
      </section>

      <section className="card p-6">
        <h2 className="font-medium text-slate-800 mb-2">Usuários consulta</h2>
        <p className="text-sm text-slate-500 mb-3">
          Adicione e exclua usuários com perfil consulta (rotativos). Eles só acessam a Agenda Forms.
        </p>
        <Link
          href="/admin/usuarios"
          className="btn-primary text-sm inline-flex items-center gap-1.5"
        >
          Gerenciar usuários consulta
        </Link>
      </section>
    </div>
  );
}
