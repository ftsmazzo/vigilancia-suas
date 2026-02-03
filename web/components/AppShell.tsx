'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';

interface AppShellProps {
  user: { email: string; name: string | null; role: string };
  children: React.ReactNode;
}

const nav = [
  { href: '/', label: 'Início' },
  { href: '/consulta', label: 'Consulta' },
  { href: '/admin', label: 'Manutenção', adminOnly: true },
];

export function AppShell({ user, children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  const isAdmin = user.role === 'admin';
  const links = nav.filter((item) => !item.adminOnly || isAdmin);

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <header className="md:hidden flex items-center justify-between p-4 border-b border-slate-200 bg-white">
        <Link href="/" className="font-semibold text-slate-800">
          Vigilância
        </Link>
        <button
          type="button"
          onClick={() => setMenuOpen(!menuOpen)}
          className="p-2 rounded-lg hover:bg-slate-100"
          aria-label="Menu"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {menuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </header>

      <aside
        className={`
          fixed md:static inset-y-0 left-0 z-40 w-64 bg-white border-r border-slate-200 transform transition-transform ease-in-out duration-200
          ${menuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        <div className="flex flex-col h-full pt-16 md:pt-0">
          <nav className="flex-1 p-4 space-y-1">
            {links.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className={`
                    block rounded-lg px-3 py-2.5 text-sm font-medium transition-colors
                    ${active ? 'bg-primary-50 text-primary-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}
                  `}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="p-4 border-t border-slate-200">
            <p className="text-xs text-slate-500 truncate" title={user.email}>
              {user.name || user.email}
            </p>
            <p className="text-xs text-slate-400 truncate">{user.email}</p>
            <span className="inline-block mt-1 text-xs font-medium text-slate-600">
              {user.role === 'admin' ? 'Administrador' : 'Consulta'}
            </span>
            <button
              type="button"
              onClick={handleLogout}
              className="mt-3 w-full text-left text-sm text-slate-500 hover:text-slate-700"
            >
              Sair
            </button>
          </div>
        </div>
      </aside>

      {menuOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-30 md:hidden"
          onClick={() => setMenuOpen(false)}
          aria-hidden
        />
      )}

      <main className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
        {children}
      </main>
    </div>
  );
}
