import Link from 'next/link';

export default function DashboardPage() {
  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-semibold text-slate-800 mb-2">Início</h1>
      <p className="text-slate-600 mb-8">
        Bem-vindo ao painel Vigilância Socioassistencial. Use o menu para acessar consultas ou manutenção.
      </p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/numerico"
          className="card p-6 block hover:border-primary-300 hover:shadow-md transition-all"
        >
          <h2 className="font-medium text-slate-800 mb-1">Dashboard Numérico</h2>
          <p className="text-sm text-slate-500">
            Totais de famílias e pessoas com filtros por dicionário (sexo, raça, faixa renda, etc.).
          </p>
        </Link>
        <Link
          href="/consulta"
          className="card p-6 block hover:border-primary-300 hover:shadow-md transition-all"
        >
          <h2 className="font-medium text-slate-800 mb-1">Agenda Forms</h2>
          <p className="text-sm text-slate-500">
            Consultar visitas com situação da família. Filtros por bairro, bloqueados, cancelados e outros campos.
          </p>
        </Link>
        <Link
          href="/admin"
          className="card p-6 block hover:border-primary-300 hover:shadow-md transition-all"
        >
          <h2 className="font-medium text-slate-800 mb-1">Manutenção</h2>
          <p className="text-sm text-slate-500">
            Upload de arquivos raw, refresh de views e alinhamento dos dados. (Admin)
          </p>
        </Link>
      </div>
    </div>
  );
}
