'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface UserRow {
  id: number;
  email: string;
  name: string | null;
  role: string;
  created_at: string;
}

export default function AdminUsuariosPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ role: string } | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [form, setForm] = useState({ email: '', password: '', name: '' });
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((data) => {
        setUser(data.user ?? null);
        if (data.user && data.user.role !== 'admin') router.replace('/');
      })
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, [router]);

  const loadUsers = () => {
    fetch('/api/admin/users')
      .then((r) => r.json())
      .then((data) => {
        if (data.users) setUsers(data.users);
      })
      .catch(() => setUsers([]));
  };

  useEffect(() => {
    if (user?.role === 'admin') loadUsers();
  }, [user?.role]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setSubmitting(true);
    fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: form.email.trim(),
        password: form.password,
        name: form.name.trim() || undefined,
      }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setMessage({ type: 'err', text: data.error });
          return;
        }
        setMessage({ type: 'ok', text: data.message || 'Usuário criado.' });
        setForm({ email: '', password: '', name: '' });
        loadUsers();
      })
      .catch(() => setMessage({ type: 'err', text: 'Erro de conexão.' }))
      .finally(() => setSubmitting(false));
  };

  const handleDelete = (id: number) => {
    if (!confirm('Excluir este usuário consulta? Ele não poderá mais acessar o sistema.')) return;
    setDeletingId(id);
    setMessage(null);
    fetch(`/api/admin/users/${id}`, { method: 'DELETE' })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setMessage({ type: 'err', text: data.error });
          return;
        }
        setMessage({ type: 'ok', text: data.message || 'Usuário excluído.' });
        loadUsers();
      })
      .catch(() => setMessage({ type: 'err', text: 'Erro de conexão.' }))
      .finally(() => setDeletingId(null));
  };

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center min-h-[200px] text-slate-500">
        Carregando…
      </div>
    );
  }

  if (user.role !== 'admin') return null;

  const consultUsers = users.filter((u) => u.role === 'consult');
  const adminUsers = users.filter((u) => u.role === 'admin');

  return (
    <div className="space-y-8 max-w-3xl">
      <div className="flex items-center gap-4">
        <Link href="/admin" className="text-slate-500 hover:text-slate-700 text-sm">
          ← Manutenção
        </Link>
        <h1 className="text-2xl font-semibold text-slate-800">Usuários consulta</h1>
      </div>
      <p className="text-slate-600 text-sm">
        Adicione e remova usuários com perfil <strong>consulta</strong> (acesso só à Agenda Forms). São rotativos; o admin controla quem entra e sai.
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
        <h2 className="font-medium text-slate-800 mb-3">Adicionar usuário consulta</h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label htmlFor="email" className="label text-xs">E-mail</label>
            <input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className="input text-sm py-1.5"
              placeholder="email@exemplo.com"
              required
            />
          </div>
          <div>
            <label htmlFor="password" className="label text-xs">Senha</label>
            <input
              id="password"
              type="password"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              className="input text-sm py-1.5"
              placeholder="••••••••"
              required
            />
          </div>
          <div>
            <label htmlFor="name" className="label text-xs">Nome (opcional)</label>
            <input
              id="name"
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="input text-sm py-1.5"
              placeholder="Nome"
            />
          </div>
          <div className="sm:col-span-3">
            <button type="submit" disabled={submitting} className="btn-primary text-sm disabled:opacity-50">
              {submitting ? 'Criando…' : 'Adicionar usuário consulta'}
            </button>
          </div>
        </form>
      </section>

      <section className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200">
          <h2 className="font-medium text-slate-800">Usuários consulta ({consultUsers.length})</h2>
        </div>
        <div className="overflow-x-auto">
          {consultUsers.length === 0 ? (
            <div className="p-6 text-center text-slate-500 text-sm">Nenhum usuário consulta cadastrado.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-3 py-2 font-medium text-slate-600">E-mail</th>
                  <th className="text-left px-3 py-2 font-medium text-slate-600">Nome</th>
                  <th className="text-left px-3 py-2 font-medium text-slate-600">Criado em</th>
                  <th className="w-24 px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {consultUsers.map((u) => (
                  <tr key={u.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-3 py-2 text-slate-700">{u.email}</td>
                    <td className="px-3 py-2 text-slate-700">{u.name || '—'}</td>
                    <td className="px-3 py-2 text-slate-500">
                      {u.created_at ? new Date(u.created_at).toLocaleDateString('pt-BR') : '—'}
                    </td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() => handleDelete(u.id)}
                        disabled={deletingId === u.id}
                        className="text-red-600 hover:text-red-700 text-xs font-medium disabled:opacity-50"
                      >
                        {deletingId === u.id ? 'Excluindo…' : 'Excluir'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {adminUsers.length > 0 && (
        <section className="card p-4">
          <h2 className="font-medium text-slate-800 mb-2">Administradores</h2>
          <p className="text-sm text-slate-500">
            {adminUsers.map((u) => u.email).join(', ')} — não podem ser excluídos por esta tela.
          </p>
        </section>
      )}
    </div>
  );
}
