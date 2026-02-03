'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

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
        Atualize as materialized views após novas inserções para manter os dados alinhados.
        O upload de arquivos raw será integrado em breve (N8N ou pipeline direto).
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
        <h2 className="font-medium text-slate-800 mb-2">Refresh de views materializadas</h2>
        <p className="text-sm text-slate-500 mb-4">
          Execute após carregar Folha, Bloqueados, Cancelados ou CADU.
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => runRefresh('familia_cpf_visitas')}
            disabled={!!refreshLoading}
            className="btn-primary disabled:opacity-50"
          >
            {refreshLoading === 'familia_cpf_visitas' ? 'Executando…' : 'Refresh Família/CPF/Visitas'}
          </button>
          <button
            type="button"
            onClick={() => runRefresh('folha_rf')}
            disabled={!!refreshLoading}
            className="btn-primary disabled:opacity-50"
          >
            {refreshLoading === 'folha_rf' ? 'Executando…' : 'Refresh Folha RF'}
          </button>
        </div>
        <p className="mt-3 text-xs text-slate-400">
          Família/CPF/Visitas: mv_familia_situacao, mv_cpf_familia_situacao. Folha RF: mv_folha_base, mv_folha_linhas, mv_folha_bloq, mv_folha_canc, mv_folha_familias.
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

      <section className="card p-6 border-dashed border-slate-300">
        <h2 className="font-medium text-slate-800 mb-2">Upload de arquivos raw</h2>
        <p className="text-sm text-slate-500">
          Em breve: upload de CSV CADU, SIBEC (Bloqueados, Cancelados, Folha) e Visitas.
          Por enquanto, use os workflows N8N ou carga manual.
        </p>
      </section>
    </div>
  );
}
